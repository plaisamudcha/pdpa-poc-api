import { randomBytes } from 'node:crypto';
import { initMongo } from '@/databases/mongoose';
import DataKeyModel from '@/externals/mongo/collections/data-key.collection';
import kms from '@/externals/kms';
import { dekContext } from './helpers';

/** สร้าง DEK ใหม่ให้ user แล้วเก็บแบบ wrap ด้วย KEK — คืน DEK (plaintext) ไว้ใช้ encrypt ต่อทันที */
export default async function create(userId: string): Promise<Buffer> {
  await initMongo();

  const dek = randomBytes(32);
  const { wrapped, kekVersion } = await kms.wrap(dek, dekContext(userId));
  await DataKeyModel.create({ _id: userId, wrappedDek: wrapped.toString('base64'), kekVersion });

  return dek;
}
