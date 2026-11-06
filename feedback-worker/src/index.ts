// Favopic Feedback-Worker
//
// POST https://api.favopic.de/feedback  ->  validieren -> Rate Limit -> E-Mail an den Betreiber.
// Der Worker speichert selbst nichts (außer anonymen Rate-Limit-Zeitstempeln für max. 10 Minuten)
// und schreibt keine Nutzerdaten ins Log.

import { EmailMessage } from "cloudflare:email";
import { buildMime } from "./mime";
import { clientKey, sha256Hex } from "./client-key";
import { RateLimiter } from "./rate-limiter";
import { LIMITS, validateFeedback, type Feedback } from "./validate";

export { RateLimiter };

export interface Env {
  // Secrets (wrangler secret put ...)
  FAVOPIC_KEY: string; // erwarteter Wert des Headers X-Favopic-Key
  FEEDBACK_TO: string; // deine Ziel-Adresse (bei Email Routing bestätigt)
  // Variablen (wrangler.toml)
  MAIL_FROM: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  // Bindings
  EMAIL: SendEmail;
  RATE_LIMITER: DurableObjectNamespace<RateLimiter>;
}

/** JSON-Antwort. Die App wertet nur den Statuscode aus. */
function json(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

/** Vergleich in konstanter Zeit: beide Werte werden zu 32-Byte-SHA-256 gehasht (gleiche Länge) und per XOR verglichen. */
async function keysEqual(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(provided)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

/** Liest den Body und bricht ab, sobald `max` Bytes überschritten werden (null = zu groß). */
async function readLimited(req: Request, max: number): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/** Erstellt und versendet die Mail. Alles Nutzerseitige nur als Klartext. */
async function forward(env: Env, f: Feedback): Promise<void> {
  const isBug = f.type === "bugReport";
  const lines = [
    `Typ: ${isBug ? "Bug-Bericht" : "Feedback"}`,
    `Antwort-Adresse (vom Nutzer angegeben, ungeprüft): ${f.email ?? "–"}`,
    ...(isBug ? [`Gerät: ${f.deviceInfo ?? "–"}`] : []),
    `Empfangen: ${new Date().toISOString()}`,
    ...(isBug ? [`Logs: ${f.logs ? "als Anhang (favopic-logs.txt)" : "nicht mitgeschickt"}`] : []),
    ``,
    `----------------------------------------`,
    f.message,
    ``,
  ];

  const raw = buildMime({
    from: env.MAIL_FROM,
    fromName: "Favopic Feedback",
    to: env.FEEDBACK_TO,
    replyTo: f.email,
    // Fester Betreff ohne Nutzerinhalt.
    subject: isBug ? "[Favopic] Bug-Bericht" : "[Favopic] Feedback",
    body: lines.join("\n"),
    attachment: f.logs ? { filename: "favopic-logs.txt", content: f.logs } : null,
  });

  await env.EMAIL.send(new EmailMessage(env.MAIL_FROM, env.FEEDBACK_TO, raw));
}

/** Loggt ausschließlich Statuscode und Größen – nie Inhalte, E-Mail-Adressen oder IPs. */
function logResult(status: number, bodyBytes: number, type?: string, hasLogs?: boolean): void {
  console.log(JSON.stringify({ status, bodyBytes, type: type ?? null, logs: hasLogs ?? null }));
}

async function handle(request: Request, env: Env): Promise<{ res: Response; bodyBytes: number; type?: string; hasLogs?: boolean }> {
  const url = new URL(request.url);

  // 1. Nur POST /feedback
  if (url.pathname !== "/feedback") return { res: json(404, { ok: false }), bodyBytes: 0 };
  if (request.method !== "POST") return { res: json(405, { ok: false }, { allow: "POST" }), bodyBytes: 0 };

  // 2. API-Key (konstante Zeit). Fehlt das Secret, lieber 500 als offen sein.
  if (!env.FAVOPIC_KEY || !env.FEEDBACK_TO || !env.MAIL_FROM) {
    console.error("config error: missing secret or var");
    return { res: json(500, { ok: false }), bodyBytes: 0 };
  }
  const provided = request.headers.get("X-Favopic-Key") ?? "";
  if (!(await keysEqual(provided, env.FAVOPIC_KEY))) return { res: json(401, { ok: false }), bodyBytes: 0 };

  // 3. Content-Type
  const ctype = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (ctype !== "application/json") return { res: json(415, { ok: false }), bodyBytes: 0 };

  // 4. Größe: erst Content-Length (billig), dann tatsächlich gelesene Bytes
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > LIMITS.maxBodyBytes) return { res: json(413, { ok: false }), bodyBytes: declared };
  const bytes = await readLimited(request, LIMITS.maxBodyBytes);
  if (bytes === null) return { res: json(413, { ok: false }), bodyBytes: LIMITS.maxBodyBytes + 1 };

  // 5. Parsen + validieren (400)
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
  } catch {
    return { res: json(400, { ok: false, error: "invalid JSON" }), bodyBytes: bytes.length };
  }
  const v = validateFeedback(parsed);
  if (!v.ok) return { res: json(400, { ok: false, error: v.error }), bodyBytes: bytes.length };
  const meta = { bodyBytes: bytes.length, type: v.value.type, hasLogs: v.value.logs !== null };

  // 6. Rate Limit pro Client-IP (erst nach erfolgreicher Validierung, damit nur
  //    tatsächlich weitergeleitete Einsendungen zählen).
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limit = Number(env.RATE_LIMIT_MAX) || 5;
  const windowMs = (Number(env.RATE_LIMIT_WINDOW_SECONDS) || 600) * 1000;
  try {
    const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(await sha256Hex(clientKey(ip))));
    const r = await stub.hit(limit, windowMs);
    if (!r.allowed) {
      return { res: json(429, { ok: false }, { "retry-after": String(r.retryAfterSeconds) }), ...meta };
    }
  } catch {
    console.error("rate limiter unavailable");
    return { res: json(503, { ok: false }), ...meta };
  }

  // 7. Weiterleiten
  try {
    await forward(env, v.value);
  } catch {
    // Absichtlich ohne Fehlermeldung/Stack (könnte Adressen oder Inhalte enthalten).
    console.error("forward failed");
    return { res: json(502, { ok: false }), ...meta };
  }
  return { res: json(200, { ok: true }), ...meta };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { res, bodyBytes, type, hasLogs } = await handle(request, env);
      logResult(res.status, bodyBytes, type, hasLogs);
      return res;
    } catch {
      // Keine Stacktraces nach außen oder ins Log.
      logResult(500, 0);
      return json(500, { ok: false });
    }
  },
} satisfies ExportedHandler<Env>;
