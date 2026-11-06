import { describe, expect, it } from "vitest";
import { buildMime } from "../src/mime";
import { clientKey } from "../src/client-key";
import { sanitize, validateFeedback } from "../src/validate";

describe("validateFeedback", () => {
  it("akzeptiert gültiges Feedback und verwirft Bug-Felder", () => {
    const r = validateFeedback({ type: "feedback", email: "", message: "Hallo", deviceInfo: "x", logs: "y" });
    expect(r).toEqual({ ok: true, value: { type: "feedback", email: null, message: "Hallo", deviceInfo: null, logs: null } });
  });
  it("akzeptiert bugReport mit Logs", () => {
    const r = validateFeedback({ type: "bugReport", email: "a@b.de", message: "kaputt", deviceInfo: "iPhone", logs: "l1\nl2" });
    expect(r.ok && r.value.logs).toBe("l1\nl2");
  });
  it("lehnt falschen Typ, leere Nachricht, falsche Datentypen ab", () => {
    expect(validateFeedback({ type: "x", message: "a" }).ok).toBe(false);
    expect(validateFeedback({ type: "feedback", message: "  \n " }).ok).toBe(false);
    expect(validateFeedback({ type: "feedback", message: 5 }).ok).toBe(false);
    expect(validateFeedback({ type: "feedback", message: "a", email: 1 }).ok).toBe(false);
    expect(validateFeedback([]).ok).toBe(false);
  });
  it("Längenlimits", () => {
    expect(validateFeedback({ type: "feedback", message: "a".repeat(5000) }).ok).toBe(true);
    expect(validateFeedback({ type: "feedback", message: "a".repeat(5001) }).ok).toBe(false);
    expect(validateFeedback({ type: "feedback", message: "👨‍👩‍👧".repeat(5000) }).ok).toBe(true); // Graphem-Zählung
    expect(validateFeedback({ type: "bugReport", message: "a", logs: "a".repeat(100_000) }).ok).toBe(true);
    expect(validateFeedback({ type: "bugReport", message: "a", logs: "a".repeat(100_001) }).ok).toBe(false);
    expect(validateFeedback({ type: "bugReport", message: "a", logs: "é".repeat(60_000) }).ok).toBe(false); // Bytes
  });
  it("ungültige E-Mail wird ignoriert, nicht abgelehnt; Injection-Versuch fliegt raus", () => {
    const r = validateFeedback({ type: "feedback", message: "a", email: "x@y.de\r\nBcc: evil@z.de" });
    expect(r.ok && r.value.email).toBe(null);
    const r2 = validateFeedback({ type: "feedback", message: "a", email: "nicht-gueltig" });
    expect(r2.ok && r2.value.email).toBe(null);
  });
});

describe("sanitize", () => {
  it("entfernt Steuerzeichen außer \\n und \\t", () => {
    expect(sanitize("a\u0000b\u0007c\td\r\ne‮f")).toBe("abc\td\nef");
  });
});

describe("buildMime", () => {
  it("setzt Reply-To, bindet Logs als Anhang ein, Nutzertext nur base64", () => {
    const m = buildMime({ from: "f@favopic.de", fromName: "Favopic Feedback", to: "me@x.de", replyTo: "u@y.de",
      subject: "[Favopic] Bug-Bericht", body: "<script>alert(1)</script>", attachment: { filename: "favopic-logs.txt", content: "log" } });
    expect(m).toContain("Reply-To: <u@y.de>");
    expect(m).toContain("multipart/mixed");
    expect(m).toContain('filename="favopic-logs.txt"');
    expect(m).not.toContain("<script>");
  });
});

describe("clientKey", () => {
  it("IPv4 unverändert, IPv6 auf /64", () => {
    expect(clientKey("1.2.3.4")).toBe("1.2.3.4");
    expect(clientKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
    expect(clientKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(clientKey("::1")).toBe("0:0:0:0::/64");
  });
});
