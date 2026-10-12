import { isValidObjectId } from 'mongoose';
import { initMongo } from '@/databases/mongoose';
import StaffModel from '@/externals/mongo/collections/staff.collection';

/** คืนเฉพาะบัญชีที่ยังเปิดใช้งาน — ไม่ดึง passwordHash */
export default async function getById(id: string) {
  await initMongo();

  if (!isValidObjectId(id)) return null;

  return StaffModel.findOne({ _id: id, isActive: true }, { passwordHash: 0 }).lean();
}
