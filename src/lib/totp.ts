import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || '';

// ─── Base32 encoding/decoding (RFC 4648) ────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_CHARS[(value << (5 - bits)) & 31];
    }

    return output;
}

function base32Decode(encoded: string): Buffer {
    const cleanInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleanInput.length; i++) {
        const idx = BASE32_CHARS.indexOf(cleanInput[i]);
        if (idx === -1) continue;

        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return Buffer.from(output);
}

// ─── TOTP (RFC 6238) ────────────────────────────────────────────────────────

/**
 * Generate a random TOTP secret (20 bytes = 160 bits, base32 encoded).
 */
export function generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return base32Encode(buffer);
}

/**
 * Generate a TOTP token for a given secret and time step.
 * Uses SHA-1 as per RFC 6238, 30-second time step, 6-digit output.
 */
function generateHOTP(secret: string, counter: number): string {
    const decodedSecret = base32Decode(secret);

    // Convert counter to 8-byte big-endian buffer
    const counterBuffer = Buffer.alloc(8);
    const high = Math.floor(counter / 0x100000000);
    const low = counter % 0x100000000;
    counterBuffer.writeUInt32BE(high, 0);
    counterBuffer.writeUInt32BE(low, 4);

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', decodedSecret);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

    // 6-digit code
    return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Generate the current TOTP for a secret.
 */
export function generateTOTP(secret: string, timeMs?: number): string {
    const time = timeMs || Date.now();
    const counter = Math.floor(time / 1000 / 30);
    return generateHOTP(secret, counter);
}

/**
 * Verify a TOTP token against a secret.
 * Allows a ±1 time step window to account for clock drift.
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    const time = Date.now();
    const currentCounter = Math.floor(time / 1000 / 30);

    for (let i = -window; i <= window; i++) {
        const counter = currentCounter + i;
        const expectedToken = generateHOTP(secret, counter);
        if (timingSafeEqual(token, expectedToken)) {
            return true;
        }
    }

    return false;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
}

// ─── QR Code / OTPAuth URI ──────────────────────────────────────────────────

/**
 * Generate an otpauth:// URI for authenticator apps.
 */
export function generateOTPAuthURI(email: string, secret: string, issuer: string = 'AI Suite'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ─── Recovery Codes ─────────────────────────────────────────────────────────

/**
 * Generate a set of recovery codes.
 * Format: XXXX-XXXX (8 alphanumeric characters split by dash).
 */
export function generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No ambiguous chars (no 0/o/1/l/i)

    for (let i = 0; i < count; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars[crypto.randomInt(chars.length)];
        }
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
}

// ─── Secret Encryption (AES-256-GCM) ────────────────────────────────────────

/**
 * Encrypt a TOTP secret for storage at rest.
 * Returns base64 encoded string: iv:authTag:ciphertext
 */
export function encryptSecret(secret: string): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
        console.warn('[TOTP] TWO_FACTOR_ENCRYPTION_KEY not set or too short. Storing secret as-is (NOT recommended for production).');
        return `plain:${secret}`;
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted TOTP secret.
 */
export function decryptSecret(encrypted: string): string {
    if (encrypted.startsWith('plain:')) {
        return encrypted.slice(6);
    }

    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
        throw new Error('TWO_FACTOR_ENCRYPTION_KEY is required to decrypt secrets');
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const [ivBase64, authTagBase64, ciphertext] = encrypted.split(':');

    if (!ivBase64 || !authTagBase64 || !ciphertext) {
        throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
