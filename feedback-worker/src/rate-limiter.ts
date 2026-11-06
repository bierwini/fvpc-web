// Rate Limiter als Durable Object (SQLite-Backend, Free Tier). Pro Client gibt es eine
// Instanz. Gespeichert werden nur Zeitstempel der letzten erlaubten Einsendungen,
// KEINE Inhalte; der Instanzname ist ein Hash der IP (bei IPv6 des /64-Präfixes).
import { DurableObject } from "cloudflare:workers";

export class RateLimiter extends DurableObject {
  /** Sliding Window: erlaubt, solange weniger als `limit` Treffer im Fenster liegen. */
  async hit(limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = Date.now();
    const stamps = ((await this.ctx.storage.get<number[]>("t")) ?? []).filter((t) => now - t < windowMs);

    if (stamps.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((stamps[0]! + windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    stamps.push(now);
    await this.ctx.storage.put("t", stamps);
    // Aufräumen: nach Ablauf des Fensters ist nichts mehr gespeichert.
    await this.ctx.storage.setAlarm(now + windowMs + 1000);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
