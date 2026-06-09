import "server-only";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// ─── Key Management ──────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 32 bytes (256 bits) encoded as base64. " +
        `Got ${buf.length} bytes.`
    );
  }
  return buf;
}

// ─── AES-256-GCM Encrypt / Decrypt ──────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: IV + AuthTag + Ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypts a base64 string produced by `encrypt()`.
 * Returns the original plaintext.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encrypted, "base64");

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ─── E.164 Phone Validation ─────────────────────────────────────────────────

/**
 * Validates that a phone number is in E.164 format.
 * E.164: starts with +, followed by 1-15 digits (country code + number).
 * Examples: +15551234567, +442071234567
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}
