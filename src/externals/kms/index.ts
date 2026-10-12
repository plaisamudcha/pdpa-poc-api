import config from '@/config';
import cipher from '@/utility/crypto/cipher';

/**
 * KEK (Key Encryption Key) provider
 * POC ใช้ LocalKeyProvider (อ่าน KEK จาก env)
 * Production ให้ implement interface เดียวกันนี้ด้วย AWS KMS / Azure Key Vault / GCP KMS / HashiCorp Vault Transit
 * โดย KEK จะไม่ออกจาก KMS เลย — ส่วนอื่นของระบบไม่ต้องแก้
 */
export interface KeyProvider {
  currentVersion(): string;
  wrap(dek: Buffer, context: string): Promise<{ wrapped: Buffer; kekVersion: string }>;
  unwrap(wrapped: Buffer, kekVersion: string, context: string): Promise<Buffer>;
}

class LocalKeyProvider implements KeyProvider {
  private readonly keks: Map<string, Buffer>;

  private readonly current: string;

  constructor(keks: Record<string, string>, current: string) {
    this.keks = new Map(Object.entries(keks).map(([version, b64]) => [version, cipher.decodeKey(b64, `KEK_${version.toUpperCase()}`)]));
    this.current = current;
    if (!this.keks.has(current)) throw new Error(`KEK ${current} not configured`);
  }

  currentVersion() {
    return this.current;
  }

  async wrap(dek: Buffer, context: string) {
    return { wrapped: cipher.encryptBytes(this.keks.get(this.current)!, dek, context), kekVersion: this.current };
  }

  async unwrap(wrapped: Buffer, kekVersion: string, context: string) {
    const kek = this.keks.get(kekVersion);
    if (!kek) throw new Error(`KEK ${kekVersion} not available`);
    return cipher.decryptBytes(kek, wrapped, context);
  }
}

const kms: KeyProvider = new LocalKeyProvider(config.encryption.KEKS, config.encryption.KEK_CURRENT);

export default kms;
