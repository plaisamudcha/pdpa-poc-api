import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';

export default async function listExpiredIds(now = new Date()): Promise<string[]> {
  await initMongo();

  const docs = await UserModel.find({ status: 'active', retentionUntil: { $lt: now } }, { _id: 1 }).lean();
  return docs.map((doc) => String(doc._id));
}
