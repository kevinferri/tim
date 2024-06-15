import crypto from "crypto";

export function decrypt(encrypted: string) {
  const algorithm = process.env.CRYPTO_ALGORITHM ?? "";
  const iv = Buffer.from(process.env.CRYPTO_IV ?? "", "utf8");
  const key = crypto.scryptSync(process.env.CRYPTO_SECRET ?? "", "salt", 24);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}
