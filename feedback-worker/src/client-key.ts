// Hilfsfunktionen für den Rate Limiter (ohne Cloudflare-Abhängigkeit, testbar).

/** IPv6 -> erste 64 Bit (sonst könnte ein Client mit einem /64 beliebig viele Adressen nutzen). */
export function clientKey(ip: string): string {
  if (!ip.includes(":") || ip.includes(".")) return ip; // IPv4 (oder IPv4-mapped): unverändert
  let groups: string[];
  if (ip.includes("::")) {
    const [a = "", b = ""] = ip.split("::");
    const head = a ? a.split(":") : [];
    const tail = b ? b.split(":") : [];
    groups = [...head, ...Array<string>(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  } else {
    groups = ip.split(":");
  }
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
