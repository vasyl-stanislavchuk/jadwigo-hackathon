/**
 * A v4 UUID for an attempt's event id. `crypto.randomUUID` exists only in a secure context (HTTPS
 * or localhost) and not at all before Safari 15.4, so a phone on the dev server's LAN address threw
 * on every Sprawdź (`dl-uukj.29.158`). `getRandomValues` works in both, and builds the same shape.
 */
export function uuid(
  c: Pick<Crypto, "getRandomValues"> & Partial<Pick<Crypto, "randomUUID">> = crypto,
): string {
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
