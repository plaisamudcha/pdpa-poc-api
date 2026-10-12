import { initMongo } from '@/databases/mongoose';
import StaffModel, { type TypeStaff } from '@/externals/mongo/collections/staff.collection';

type IUpsertStaff = Pick<TypeStaff, 'username' | 'passwordHash' | 'displayName' | 'role'>;

/** สร้างหรืออัปเดตบัญชี (ใช้ใน seed) — รีเซ็ตการล็อก และเพิกถอน session เดิมเพราะรหัสผ่านอาจเปลี่ยน */
export default async function upsert(data: IUpsertStaff) {
  await initMongo();

  return StaffModel.updateOne(
    { username: data.username },
    { $set: { ...data, isActive: true, failedLoginCount: 0, lockedUntil: null }, $inc: { sessionVersion: 1 } },
    { upsert: true }
  );
}
