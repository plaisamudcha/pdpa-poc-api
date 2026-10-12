import type { StaffRole } from './actor';

/** ข้อมูลพนักงานที่ส่งกลับให้หน้าเว็บ — ไม่มี passwordHash */
export type StaffProfile = {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
};

/**
 * payload ใน JWT — ไม่มี role (role อ่านจาก DB ทุก request เพื่อให้เปลี่ยน/ปิดสิทธิ์มีผลทันที)
 * ver = sessionVersion ของบัญชีตอนออก token — ไม่ตรงกับใน DB แล้วถือว่า token ถูกเพิกถอน
 */
export type TokenPayload = {
  sub: string;
  ver: number;
};
