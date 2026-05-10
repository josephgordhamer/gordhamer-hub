// AES-256-GCM symmetric encryption for stored credentials.
// Key comes from CALDAV_ENCRYPTION_KEY (64-char hex = 32 bytes).
import crypto from "crypto";

function getKey(): Buffer {
  const k = process.env.CALDAV_ENCRYPTION_KEY;
  if (!k || k.length < 32) {
    throw new Error(
      "CALDAV_ENCRYPTION_KEY env var is missing or too short — must be 64 hex chars (32 bytes).",
    );
  }
  if (k.length === 64 && /^[0-9a-fA-F]+$/.test(k)) return Buffer.from(k, "hex");
  // Allow non-hex strings: derive 32 bytes via SHA-256 (less ideal, but workable).
  return crypto.createHash("sha256").update(k).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
