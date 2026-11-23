import "server-only";

/**
 * Small sliding-window rate limiter. It lives in memory, so on Vercel it is
 * per-instance (best effort). That is enough for a demo; for production put it
 * in Redis/Upstash or a Postgres table.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request, userId?: string | null) {
  if (userId) return `u:${userId}`;
  const device = req.headers.get("x-device-id")?.slice(0, 64);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  return `d:${device ?? ""}:${ip}`;
}
