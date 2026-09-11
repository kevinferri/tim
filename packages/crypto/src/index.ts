import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const ENVELOPE_VERSION = "v1";

export class DecryptionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DecryptionError";
  }
}

function loadKey(): Buffer {
  const raw = process.env.CRYPTO_KEY;

  if (!raw) {
    throw new Error(
      "CRYPTO_KEY environment variable is not set (expected a base64-encoded 32-byte key)"
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CRYPTO_KEY must decode to ${KEY_LENGTH} bytes, got ${key.length}. ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  return key;
}

// Loaded eagerly so a missing/malformed key fails at import time (app
// startup) instead of on the first encrypt()/decrypt() call.
const key = loadKey();

/**
 * Encrypts `plaintext` with AES-256-GCM, using `aad` (e.g. a message id) as
 * additional authenticated data so ciphertext from one row can't be copied
 * into another and decrypt "successfully".
 *
 * Envelope: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`.
 */
export function encrypt(plaintext: string, aad: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

/**
 * Decrypts an envelope produced by `encrypt()`. `aad` must match the value
 * passed to `encrypt()` for this ciphertext, or decryption fails.
 *
 * Throws `DecryptionError` on a malformed envelope, an AAD mismatch, or a
 * failed auth-tag check (tampered/corrupted ciphertext) -- callers should
 * not swallow this into empty-string fallback text, since that would hide
 * data integrity failures.
 */
export function decrypt(envelope: string, aad: string): string {
  const parts = envelope.split(":");

  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new DecryptionError(`Unrecognized ciphertext envelope format`);
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(authTag);

    return (
      decipher.update(ciphertext).toString("utf8") +
      decipher.final().toString("utf8")
    );
  } catch (cause) {
    console.error(
      "[crypto] decryption failed: auth tag verification failed (tampered/corrupt ciphertext, or wrong AAD)"
    );
    throw new DecryptionError("Failed to decrypt: authentication failed", {
      cause,
    });
  }
}
