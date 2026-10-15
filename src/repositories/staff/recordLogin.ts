import config from '@/config';
import { initMongo } from '@/databases/mongoose';
import StaffModel from '@/externals/mongo/collections/staff.collection';

async function success(id: string) {
  await initMongo();

  return StaffModel.updateOne({ _id: id }, { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
}

/** นับครั้งที่ใส่รหัสผิด ถ้าถึงเกณฑ์ให้ล็อกบัญชี — คืนค่าว่าบัญชีถูกล็อกจากครั้งนี้หรือไม่ */
async function failure(id: string): Promise<boolean> {
  await initMongo();

  const { MAX_FAILED_LOGIN, LOCK_MINUTES } = config.auth;
  const updated = await StaffModel.findOneAndUpdate({ _id: id }, { $inc: { failedLoginCount: 1 } }, { returnDocument: 'after' }).lean();

  if (updated && updated.failedLoginCount >= MAX_FAILED_LOGIN) {
    await StaffModel.updateOne({ _id: id }, { $set: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } });
    return true;
  }
  return false;
}

/** เพิกถอน token ทุกตัวของบัญชีนี้ (ทุกเครื่อง) */
async function revokeSessions(id: string) {
  await initMongo();

  return StaffModel.updateOne({ _id: id }, { $inc: { sessionVersion: 1 } });
}

export default { success, failure, revokeSessions };
