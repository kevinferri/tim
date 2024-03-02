import crypto from "crypto";

const algorithm = process.env.CRYPTO_ALGORITHM;
const key = crypto.scryptSync(process.env.CRYPTO_SECRET, "salt", 24);
const iv = Buffer.from(process.env.CRYPTO_IV, "utf8");

export function encrypt(text: string) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

export function decrypt(encrypted: string) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8"); //deciphered text
}
