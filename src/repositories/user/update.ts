import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';

/** $set เฉพาะ field ที่ส่งมา เช่น { 'pii.phone': '<ciphertext>', 'searchIdx.phoneLast4': '<hmac>' } */
export default async function update(id: string, $set: Record<string, unknown>) {
  await initMongo();

  return UserModel.updateOne({ _id: id, status: 'active' }, { $set });
}
