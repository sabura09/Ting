/**
 * Google reCAPTCHA v3 server-side verification.
 * Gracefully degrades if keys are not configured.
 */
import { db } from '@/lib/db';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface RecaptchaVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

interface VerifyResult {
    success: boolean;
    score?: number;
    error?: string;
}

/**
 * Verify a reCAPTCHA v3 token server-side.
 *
 * @param token - The reCAPTCHA response token from the client
 * @param expectedAction - The expected action name (optional, for additional verification)
 * @param minScore - Minimum acceptable score (0.0 to 1.0, default 0.5)
 * @returns Verification result with success status and score
 */
export async function verifyRecaptcha(
    token: string | undefined | null,
    expectedAction?: string,
    minScore: number = 0.5
): Promise<VerifyResult> {
    // Check if reCAPTCHA is enforced in settings
    try {
        const settings = await db.getSettings();
        if (settings.metadata?.enableRecaptcha === false) {
            return { success: true, score: 1.0 };
        }
    } catch (error) {
        console.error('[reCAPTCHA] Error fetching settings:', error);
    }

    // If reCAPTCHA is not configured, allow through with a warning
    if (!RECAPTCHA_SECRET_KEY) {
        console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured. Skipping verification.');
        return { success: true, score: 1.0 };
    }

    // If no token provided, fail
    if (!token || token === 'bypassed-disabled' || token === 'bypassed-no-key') {
        return { success: false, error: 'reCAPTCHA token is missing or invalid' };
    }

    try {
        const params = new URLSearchParams({
            secret: RECAPTCHA_SECRET_KEY,
            response: token,
        });

        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            console.error('[reCAPTCHA] Verification API returned non-OK status:', response.status);
            return { success: false, error: 'reCAPTCHA verification service unavailable' };
        }

        const data: RecaptchaVerifyResponse = await response.json();

        if (!data.success) {
            const errorCodes = data['error-codes']?.join(', ') || 'unknown';
            console.warn('[reCAPTCHA] Verification failed:', errorCodes);
            return { success: false, error: `reCAPTCHA verification failed: ${errorCodes}` };
        }

        // Check action if specified
        if (expectedAction && data.action !== expectedAction) {
            console.warn(`[reCAPTCHA] Action mismatch. Expected: ${expectedAction}, Got: ${data.action}`);
            return { success: false, error: 'reCAPTCHA action mismatch' };
        }

        // Check score
        const score = data.score ?? 0;
        if (score < minScore) {
            console.warn(`[reCAPTCHA] Score too low: ${score} (minimum: ${minScore})`);
            return { success: false, score, error: 'reCAPTCHA score too low — suspected bot activity' };
        }

        return { success: true, score };
    } catch (error: any) {
        console.error('[reCAPTCHA] Verification error:', error.message || error);
        // In case of network errors, we fail open with a warning to avoid blocking legitimate users
        console.warn('[reCAPTCHA] Failing open due to verification error');
        return { success: true, score: 0, error: 'reCAPTCHA verification skipped due to error' };
    }
}
