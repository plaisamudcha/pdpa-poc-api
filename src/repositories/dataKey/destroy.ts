import { initMongo } from '@/databases/mongoose';
import DataKeyModel from '@/externals/mongo/collections/data-key.collection';

/** Crypto-shredding: ลบ DEK ทิ้ง ciphertext ทุกที่ (รวม backup) จะอ่านไม่ได้อีก */
export default async function destroy(userId: string) {
  await initMongo();

  return DataKeyModel.deleteOne({ _id: userId });
}
