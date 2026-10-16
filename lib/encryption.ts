import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedValue = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hexadecimal string.");
  }

  return Buffer.from(key, "hex");
}

export function encrypt(value: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encryptedValue = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedValue: encryptedValue.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt({ encryptedValue, iv, authTag }: EncryptedValue): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
