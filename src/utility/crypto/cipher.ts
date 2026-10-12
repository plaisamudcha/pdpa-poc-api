import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM: ได้ทั้ง confidentiality และ integrity (ตรวจจับการแก้ไข ciphertext ได้)
const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 'v1';

function encryptBytes(key: Buffer, data: Buffer, aad: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

function decryptBytes(key: Buffer, raw: Buffer, aad: string): Buffer {
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * Encrypt string → "v1.<base64(iv|tag|ciphertext)>"
 * aad (Additional Authenticated Data) ผูก ciphertext กับ userId+field
 * กันการเอา ciphertext ของคนอื่น/field อื่นมาสลับใส่
 */
function encrypt(key: Buffer, plaintext: string, aad: string): string {
  return `${VERSION}.${encryptBytes(key, Buffer.from(plaintext, 'utf8'), aad).toString('base64')}`;
}

function decrypt(key: Buffer, payload: string, aad: string): string {
  const [version, b64] = payload.split('.');
  if (version !== VERSION || !b64) throw new Error('Unsupported ciphertext format');
  return decryptBytes(key, Buffer.from(b64, 'base64'), aad).toString('utf8');
}

function decodeKey(b64: string, name: string): Buffer {
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error(`${name} must be 32 bytes (base64)`);
  return key;
}

export default { encrypt, decrypt, encryptBytes, decryptBytes, decodeKey };
