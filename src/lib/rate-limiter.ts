/**
 * In-memory sliding window rate limiter for brute-force protection.
 * Uses a Map to track attempts per key (email, IP, or composite).
 *
 * Note: This is per-process. In a multi-instance deployment, consider
 * using Redis or database-backed rate limiting. For most deployments
 * (single Vercel function, single server), this is sufficient.
 */

interface AttemptRecord {
    timestamps: number[];
}

const store = new Map<string, AttemptRecord>();

// Clean up expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            // Remove timestamps older than 1 hour
            record.timestamps = record.timestamps.filter(t => now - t < 3600000);
            if (record.timestamps.length === 0) {
                store.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);

    // Unref so it doesn't keep the process alive
    if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
        cleanupTimer.unref();
    }
}

/**
 * Check if a key has exceeded the rate limit.
 *
 * @param key - Unique identifier (e.g., "login:email@example.com" or "login:192.168.1.1")
 * @param maxAttempts - Maximum number of attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with `allowed` boolean and `remainingAttempts` count
 */
export function checkRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
    ensureCleanup();

    const now = Date.now();
    const record = store.get(key);

    if (!record) {
        return { allowed: true, remainingAttempts: maxAttempts };
    }

    // Filter to only timestamps within the window
    const recentAttempts = record.timestamps.filter(t => now - t < windowMs);
    record.timestamps = recentAttempts;

    if (recentAttempts.length >= maxAttempts) {
        // Find when the oldest attempt in window will expire
        const oldestInWindow = recentAttempts[0];
        const retryAfterMs = windowMs - (now - oldestInWindow);

        return {
            allowed: false,
            remainingAttempts: 0,
            retryAfterMs: Math.max(0, retryAfterMs),
        };
    }

    return {
        allowed: true,
        remainingAttempts: maxAttempts - recentAttempts.length,
    };
}

/**
 * Record an attempt for a given key.
 */
export function recordAttempt(key: string): void {
    ensureCleanup();

    const record = store.get(key);
    if (record) {
        record.timestamps.push(Date.now());
    } else {
        store.set(key, { timestamps: [Date.now()] });
    }
}

/**
 * Reset attempts for a key (e.g., on successful login).
 */
export function resetAttempts(key: string): void {
    store.delete(key);
}

// ─── Convenience helpers for common rate limit scenarios ─────────────────────

/**
 * Rate limit for login attempts: 5 attempts per 15 minutes per key.
 */
export function checkLoginRateLimit(email: string, ip: string): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
    const emailResult = checkRateLimit(`login:email:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
    const ipResult = checkRateLimit(`login:ip:${ip}`, 15, 15 * 60 * 1000);

    if (!emailResult.allowed) return emailResult;
    if (!ipResult.allowed) return ipResult;

    return {
        allowed: true,
        remainingAttempts: Math.min(emailResult.remainingAttempts, ipResult.remainingAttempts),
    };
}

/**
 * Record a login attempt for both email and IP.
 */
export function recordLoginAttempt(email: string, ip: string): void {
    recordAttempt(`login:email:${email.toLowerCase()}`);
    recordAttempt(`login:ip:${ip}`);
}

/**
 * Reset login attempts for a user (on successful login).
 */
export function resetLoginAttempts(email: string, ip: string): void {
    resetAttempts(`login:email:${email.toLowerCase()}`);
    resetAttempts(`login:ip:${ip}`);
}

/**
 * Rate limit for 2FA verification: 5 attempts per 5 minutes.
 */
export function check2FARateLimit(email: string): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
    return checkRateLimit(`2fa:${email.toLowerCase()}`, 5, 5 * 60 * 1000);
}

/**
 * Rate limit for email verification resend: 3 per hour.
 */
export function checkResendRateLimit(email: string): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
    return checkRateLimit(`resend:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
}
