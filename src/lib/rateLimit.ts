/**
 * rateLimit.ts — a minimal in-memory token-bucket limiter, keyed by client IP.
 *
 * Purpose: cap per-request spend on the paid upstreams (OpenAI / Groq / Google
 * Places) so a single caller can't run up the bill. This is intentionally
 * simple — state lives in process memory, so on a multi-instance/serverless
 * deploy each instance limits independently. Good enough for now; swap for a
 * shared store (e.g. Upstash/Redis) if this needs to be exact across instances.
 */
import type { NextRequest } from "next/server";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitOptions {
  // Max burst — the bucket starts full and never exceeds this.
  capacity: number;
  // Sustained rate: tokens added back per second.
  refillPerSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  // Seconds until at least one token is available (for the Retry-After header).
  retryAfterSec: number;
}

const buckets = new Map<string, Bucket>();
// Coarse guard against unbounded growth from many distinct IPs. When we cross
// this, drop buckets that have fully refilled (i.e. idle callers we no longer
// need to track).
const MAX_BUCKETS = 10_000;

// Derive a best-effort client IP. Behind Vercel/proxies the real client is the
// first entry of x-forwarded-for; fall back to a shared bucket if unknown.
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: opts.capacity, updatedAt: now };

  // Refill based on elapsed time since we last saw this key.
  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec);
  bucket.updatedAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    if (buckets.size > MAX_BUCKETS) prune(opts.capacity);
    return { allowed: true, retryAfterSec: 0 };
  }

  buckets.set(key, bucket);
  const retryAfterSec = Math.ceil((1 - bucket.tokens) / opts.refillPerSec);
  return { allowed: false, retryAfterSec };
}

function prune(capacity: number): void {
  const stale: string[] = [];
  buckets.forEach((bucket, key) => {
    if (bucket.tokens >= capacity) stale.push(key);
  });
  stale.forEach((key) => buckets.delete(key));
}
