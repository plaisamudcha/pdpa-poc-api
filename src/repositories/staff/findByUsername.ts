import { initMongo } from '@/databases/mongoose';
import StaffModel from '@/externals/mongo/collections/staff.collection';

export default async function findByUsername(username: string) {
  await initMongo();

  return StaffModel.findOne({ username: username.trim().toLowerCase() }).lean();
}
