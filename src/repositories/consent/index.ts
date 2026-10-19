import { initMongo } from '@/databases/mongoose';
import ConsentModel, { type TypeConsent } from '@/externals/mongo/collections/consent.collection';

type CreateConsent = Omit<TypeConsent, '_id' | 'createdAt'>;

async function create(data: CreateConsent) {
  await initMongo();

  return ConsentModel.create(data);
}

async function removeById(id: string) {
  await initMongo();

  return ConsentModel.deleteOne({ _id: id });
}

/** ประวัติของ user คนเดียว ใหม่สุดก่อน */
async function listByUser(userId: string) {
  await initMongo();

  return ConsentModel.find({ userId }).sort({ createdAt: -1, _id: -1 }).lean();
}

/** record ล่าสุดของแต่ละ user — ใช้แสดงสถานะในหน้ารายการ */
async function latestByUsers(userIds: string[]) {
  await initMongo();

  if (userIds.length === 0) return [];

  return ConsentModel.aggregate<TypeConsent>([
    { $match: { userId: { $in: userIds } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);
}

export default {
  create,
  removeById,
  listByUser,
  latestByUsers,
};
