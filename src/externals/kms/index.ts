import { LocalKeyProvider, type KeyProvider } from '@pdpa/crypto';
import config from '@/config';

/**
 * KEK provider — POC ใช้ LocalKeyProvider (อ่าน KEK จาก env)
 * Production ให้ implement KeyProvider ของ @pdpa/crypto ด้วย AWS KMS / Azure Key Vault / GCP KMS / HashiCorp Vault Transit
 * แล้วเปลี่ยนแค่บรรทัดนี้ — ส่วนอื่นของระบบไม่ต้องแก้
 */
const kms: KeyProvider = new LocalKeyProvider(config.encryption.KEKS, config.encryption.KEK_CURRENT);

export default kms;
