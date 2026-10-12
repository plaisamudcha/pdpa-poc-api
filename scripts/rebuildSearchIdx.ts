import mongoose from 'mongoose';
import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';
import dataKeyRepo from '@/repositories/dataKey';
import { buildSearchIdx, decryptView } from '@/services/user/helpers';

// สร้าง searchIdx ใหม่ทั้งหมดจากข้อมูลที่ decrypt แล้ว — ใช้เมื่อ:
//  - ย้ายจาก schema เดิม (emailIdx / citizenIdIdx) มาเป็น searchIdx
//  - เปลี่ยน BLIND_INDEX_KEY หรือเปลี่ยนกติกาการทำ index (เช่นความยาว prefix)
// bun run rebuild-search-idx
try {
  await initMongo();
  let count = 0;

  for await (const doc of UserModel.find({ status: 'active' }).lean().cursor()) {
    const userId = String(doc._id);
    const dek = await dataKeyRepo.getDek(userId);
    if (!dek) {
      console.warn(`skip ${userId}: data key missing`);
      continue;
    }

    const { view } = decryptView(doc, dek, userId, 'all');
    await UserModel.collection.updateOne(
      { _id: doc._id },
      { $set: { searchIdx: buildSearchIdx(view) }, $unset: { emailIdx: '', citizenIdIdx: '' } }
    );
    count += 1;
  }

  // ลบ index เก่าที่ไม่อยู่ใน schema แล้ว (emailIdx_1, citizenIdIdx_1) และสร้าง index ใหม่ที่ยังไม่มี
  const dropped = await UserModel.syncIndexes();
  console.log(`rebuilt searchIdx for ${count} user(s); dropped indexes: ${dropped.length ? dropped.join(', ') : '-'}`);
} finally {
  await mongoose.disconnect();
}
