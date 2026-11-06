// Baut eine RFC-5322/MIME-Mail von Hand (keine Abhängigkeit). Alle Nutzerinhalte landen
// ausschließlich als text/plain (Base64) bzw. als Textanhang – nie als HTML und nie in
// Headern außer dem validierten Reply-To.

const CRLF = "\r\n";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const b64 = btoa(bin);
  // Zeilen auf 76 Zeichen umbrechen (MIME-Vorgabe)
  return (b64.match(/.{1,76}/g) ?? []).join(CRLF);
}

export interface MimeInput {
  from: string; // reine Adresse, z. B. feedback@favopic.de
  fromName: string; // ASCII-Anzeigename
  to: string;
  replyTo?: string | null; // MUSS vorab mit isPlausibleEmail geprüft sein
  subject: string; // nur ASCII, ohne Nutzerinhalt
  body: string; // Klartext
  attachment?: { filename: string; content: string } | null;
}

export function buildMime(m: MimeInput): string {
  const domain = m.from.split("@")[1] ?? "localhost";
  const headers = [
    `From: ${m.fromName} <${m.from}>`,
    `To: <${m.to}>`,
    ...(m.replyTo ? [`Reply-To: <${m.replyTo}>`] : []),
    `Subject: ${m.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `MIME-Version: 1.0`,
    `Auto-Submitted: auto-generated`,
  ];

  const textPart = [
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    toBase64(m.body),
  ].join(CRLF);

  if (!m.attachment) {
    return headers.join(CRLF) + CRLF + textPart + CRLF;
  }

  const boundary = `favopic-${crypto.randomUUID()}`;
  const attachmentPart = [
    `Content-Type: text/plain; charset=utf-8; name="${m.attachment.filename}"`,
    `Content-Disposition: attachment; filename="${m.attachment.filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    toBase64(m.attachment.content),
  ].join(CRLF);

  return (
    headers.join(CRLF) +
    CRLF +
    `Content-Type: multipart/mixed; boundary="${boundary}"` +
    CRLF +
    CRLF +
    `--${boundary}` + CRLF + textPart + CRLF +
    `--${boundary}` + CRLF + attachmentPart + CRLF +
    `--${boundary}--` + CRLF
  );
}
