/**
 * Small in-memory fixed-window rate limiter.
 * LIMITATION: state is per server instance. It protects a single Node process (dev, demo, one container).
 * On serverless or multi-instance deployments, replace the store with a shared one (e.g. Redis) behind the same signature.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  b.count++
  return b.count <= opts.limit ? { ok: true, retryAfterSec: 0 } : { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
}
