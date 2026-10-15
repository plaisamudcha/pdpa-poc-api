import { isValidObjectId } from 'mongoose';
import { initMongo } from '@/databases/mongoose';
import StaffModel from '@/externals/mongo/collections/staff.collection';

/** ดึงชื่อพนักงานหลายคนพร้อมกัน (รวมบัญชีที่ปิดแล้ว) — ใช้แสดงชื่อใน audit log */
export default async function findByIds(ids: string[]) {
  await initMongo();

  const validIds = [...new Set(ids)].filter((id) => isValidObjectId(id));
  if (validIds.length === 0) return [];

  return StaffModel.find({ _id: { $in: validIds } }, { username: 1, displayName: 1, role: 1, isActive: 1 }).lean();
}
