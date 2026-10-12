import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';

/** ลบ ciphertext และ blind index ทั้งหมดออกจาก document — เหลือไว้แค่ metadata ว่าเคยมี user นี้และถูกลบเมื่อไร */
export default async function erase(id: string) {
  await initMongo();

  return UserModel.updateOne({ _id: id }, { $set: { status: 'erased', erasedAt: new Date(), pii: {} }, $unset: { searchIdx: '' } });
}
