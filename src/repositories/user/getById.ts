import { isValidObjectId } from 'mongoose';
import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';

export default async function getById(id: string) {
  await initMongo();

  if (!isValidObjectId(id)) return null;

  return UserModel.findOne({ _id: id, status: 'active' }).lean();
}
