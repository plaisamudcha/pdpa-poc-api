import { initMongo } from '@/databases/mongoose';
import UserModel, { type TypeSearchIdx, type TypeUser } from '@/externals/mongo/collections/user.collection';

type ICreateUserDoc = Pick<TypeUser, '_id' | 'pii' | 'retentionUntil'> & { searchIdx: Partial<TypeSearchIdx> };

export default async function create(data: ICreateUserDoc) {
  await initMongo();

  return UserModel.create(data);
}
