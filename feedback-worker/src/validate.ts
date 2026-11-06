// Validierung und Bereinigung der Eingabe. Reine Funktionen ohne Cloudflare-Abhängigkeit
// (dadurch mit vitest testbar).

/** Grenzen laut Vertrag mit der App. */
export const LIMITS = {
  maxBodyBytes: 200 * 1024, // gesamte Request-Größe
  maxMessageChars: 5_000,
  maxEmailChars: 254,
  maxDeviceInfoChars: 1_000, // in der App nicht festgelegt, großzügige Obergrenze
  maxLogsBytes: 100_000, // UTF-8-Bytes
} as const;

export type FeedbackType = "feedback" | "bugReport";

export interface Feedback {
  type: FeedbackType;
  /** Nur gesetzt, wenn syntaktisch plausibel. Ungeprüft: nur ein Reply-To-Hinweis. */
  email: string | null;
  message: string;
  /** Nur bei bugReport. */
  deviceInfo: string | null;
  /** Nur bei bugReport. */
  logs: string | null;
}

export type ParseResult =
  | { ok: true; value: Feedback }
  | { ok: false; error: string };

/**
 * Entfernt Steuerzeichen außer \n und \t. \r\n / \r werden zu \n.
 * Entfernt außerdem C1-Steuerzeichen, Unicode-Zeilen-/Absatztrenner und
 * Bidi-Override-Zeichen (Textumkehr-Tricks) und ersetzt einzelne Surrogate.
 */
export function sanitize(input: string): string {
  return input
    .toWellFormed()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g, "");
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Zeichenzahl wie Swifts String.count (Graphem-Cluster), damit Emoji nicht überzählt werden. */
export function charCount(s: string): number {
  // Schneller Pfad: UTF-16-Länge ist immer >= Graphem-Anzahl.
  if (s.length <= 254) return s.length;
  let n = 0;
  for (const _ of segmenter.segment(s)) n++;
  return n;
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

// Pragmatische Prüfung (kein vollständiges RFC 5322). Verbietet bewusst Leerzeichen,
// Kommas, Anführungszeichen, Klammern und Steuerzeichen -> kein Header-Injection-Risiko.
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isPlausibleEmail(s: string): boolean {
  return s.length <= LIMITS.maxEmailChars && EMAIL_RE.test(s);
}

/** Prüft das bereits geparste JSON. Liefert bei Fehler eine kurze, nicht sensible Meldung. */
export function validateFeedback(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const o = raw as Record<string, unknown>;

  if (o.type !== "feedback" && o.type !== "bugReport") {
    return { ok: false, error: "invalid type" };
  }
  const type: FeedbackType = o.type;

  // message: Pflicht, nicht leer
  if (typeof o.message !== "string") return { ok: false, error: "message must be a string" };
  const message = sanitize(o.message).trim();
  if (message.length === 0) return { ok: false, error: "message must not be empty" };
  if (charCount(message) > LIMITS.maxMessageChars) return { ok: false, error: "message too long" };

  // email: optional, darf "" sein; ungültige Adressen werden ignoriert (nur Reply-To-Hinweis)
  let email: string | null = null;
  if (o.email !== undefined && o.email !== null) {
    if (typeof o.email !== "string") return { ok: false, error: "email must be a string" };
    if (charCount(o.email) > LIMITS.maxEmailChars) return { ok: false, error: "email too long" };
    const candidate = o.email.trim();
    email = isPlausibleEmail(candidate) ? candidate : null;
  }

  // deviceInfo / logs: nur bei bugReport relevant; bei feedback still verworfen
  let deviceInfo: string | null = null;
  let logs: string | null = null;

  if (o.deviceInfo !== undefined && o.deviceInfo !== null && typeof o.deviceInfo !== "string") {
    return { ok: false, error: "deviceInfo must be a string" };
  }
  if (o.logs !== undefined && o.logs !== null && typeof o.logs !== "string") {
    return { ok: false, error: "logs must be a string" };
  }

  if (type === "bugReport") {
    if (typeof o.deviceInfo === "string") {
      // einzeilig erzwingen
      const d = sanitize(o.deviceInfo).replace(/[\n\t]+/g, " ").trim();
      if (charCount(d) > LIMITS.maxDeviceInfoChars) return { ok: false, error: "deviceInfo too long" };
      deviceInfo = d || null;
    }
    if (typeof o.logs === "string") {
      const l = sanitize(o.logs);
      if (byteLength(l) > LIMITS.maxLogsBytes) return { ok: false, error: "logs too large" };
      logs = l.trim() ? l : null;
    }
  }

  return { ok: true, value: { type, email, message, deviceInfo, logs } };
}
