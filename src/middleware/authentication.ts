import type { NextFunction, Request, Response } from 'express';
import config from '@/config';
import { errRes } from '@/controllers/main';
import type { StaffRole } from '@/models/business/actor';
import staffRepo from '@/repositories/staff';
import { jwtHelper } from '@/utility';

/**
 * ตรวจ JWT จาก httpOnly cookie แล้วโหลดบัญชีพนักงานจาก DB
 * role อ่านจาก DB ทุก request (ไม่เชื่อค่าใน token) — เปลี่ยน role หรือปิดบัญชีแล้วมีผลทันที
 */
async function authentication(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: string | undefined = req.cookies?.[config.auth.COOKIE_NAME];
  const payload = token ? jwtHelper.verify(token) : null;
  const staff = payload ? await staffRepo.getById(payload.sub) : null;

  // sessionVersion ไม่ตรง = token ถูกเพิกถอนแล้ว (logout / รีเซ็ตรหัสผ่าน)
  if (!staff || (staff.sessionVersion ?? 0) !== payload?.ver) {
    res.status(401).json(errRes.UNAUTHORIZED({ message: 'กรุณาเข้าสู่ระบบ' }));
    return;
  }

  const id = String(staff._id);
  const role = staff.role as StaffRole;
  req.actor = { id, role };
  req.staff = { id, username: staff.username, displayName: staff.displayName, role };
  next();
}

export default authentication;
