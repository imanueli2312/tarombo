/**
 * Simple in-memory rate limiter for login attempts.
 * Not persisted across server restarts, but effective against brute force
 * within a single session. Production deployments should use Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const attempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block after max attempts

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (!entry.blockedUntil && now - entry.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    } else if (entry.blockedUntil && now > entry.blockedUntil) {
      attempts.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number | null;
} {
  cleanupOldEntries();

  const now = Date.now();
  const entry = attempts.get(identifier);

  if (!entry) {
    attempts.set(identifier, { count: 1, firstAttempt: now, blockedUntil: null });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, retryAfterSeconds: null };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  // Reset if block expired
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    attempts.set(identifier, { count: 1, firstAttempt: now, blockedUntil: null });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, retryAfterSeconds: null };
  }

  // Check if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(identifier, { count: 1, firstAttempt: now, blockedUntil: null });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, retryAfterSeconds: null };
  }

  // Increment attempt
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.count,
    retryAfterSeconds: null,
  };
}

export function resetRateLimit(identifier: string): void {
  attempts.delete(identifier);
}