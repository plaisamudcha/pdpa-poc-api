import { initMongo } from '@/databases/mongoose';
import DataKeyModel from '@/externals/mongo/collections/data-key.collection';
import kms from '@/externals/kms';
import { dekContext } from './helpers';

/** KEK rotation: re-wrap DEK ทุกตัวที่ยังใช้ KEK เก่า ด้วย KEK ปัจจุบัน (ข้อมูล user ไม่ต้อง re-encrypt) */
export default async function rewrapAll(): Promise<number> {
  await initMongo();

  const target = kms.currentVersion();
  let count = 0;

  for await (const doc of DataKeyModel.find({ kekVersion: { $ne: target } }).lean().cursor()) {
    const dek = await kms.unwrap(Buffer.from(doc.wrappedDek, 'base64'), doc.kekVersion, dekContext(doc._id));
    const { wrapped, kekVersion } = await kms.wrap(dek, dekContext(doc._id));
    await DataKeyModel.updateOne({ _id: doc._id }, { $set: { wrappedDek: wrapped.toString('base64'), kekVersion, rotatedAt: new Date() } });
    count += 1;
  }

  return count;
}
