import { initMongo } from '@/databases/mongoose';
import DataKeyModel from '@/externals/mongo/collections/data-key.collection';
import kms from '@/externals/kms';
import { dekContext } from './helpers';

/**
 * คืน DEK (plaintext) ของ user หรือ null ถ้าถูกทำลายไปแล้ว
 * Production ที่ใช้ KMS จริง: ควร cache DEK ใน memory (TTL สั้น) เพื่อลด latency/ค่าใช้จ่าย
 */
export default async function getDek(userId: string): Promise<Buffer | null> {
  await initMongo();

  const doc = await DataKeyModel.findById(userId).lean();
  if (!doc) return null;

  return kms.unwrap(Buffer.from(doc.wrappedDek, 'base64'), doc.kekVersion, dekContext(userId));
}
