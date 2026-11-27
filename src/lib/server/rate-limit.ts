import "server-only";

/**
 * Small sliding-window rate limiter. It lives in memory, so on Vercel it is
 * per-instance (best effort). That is enough for a demo; for production put it
 * in Redis/Upstash or a Postgres table.
 */
const buckets = new Map<string, number[]>();
let longestWindow = 0;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  longestWindow = Math.max(longestWindow, windowMs);
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    // prune with the longest window in use, so a busy 1-minute limit can't wipe a 30-minute one
    for (const [k, v] of buckets) if (!v.some((t) => now - t < longestWindow)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Who a request counts against: signed-in users by account, everyone else by IP.
 * Never by a header the caller picks (it used to include x-device-id, so sending a
 * new one each time got a fresh allowance every request). On Vercel the platform
 * sets x-real-ip / x-forwarded-for itself, so clients can't spoof them.
 */
export function clientKey(req: Request, userId?: string | null) {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get("x-real-ip")?.trim() || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  return `ip:${ip}`;
}
