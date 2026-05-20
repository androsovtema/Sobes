import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// AES-256-GCM шифрование для секретов в БД (OAuth-токены Яндекса).
// Ключ берётся из YANDEX_TOKEN_ENC_KEY (любая строка, нормализуется до 32 байт через SHA-256).
// Формат на выходе: base64(iv[12] || authTag[16] || ciphertext).

function getKey(): Buffer {
  const raw = process.env.YANDEX_TOKEN_ENC_KEY;
  if (!raw || raw.length < 16) {
    throw new Error(
      "YANDEX_TOKEN_ENC_KEY не задан или короче 16 символов. Сгенерируй случайную строку и положи в .env.local."
    );
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
