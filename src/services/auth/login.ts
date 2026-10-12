import { errRes, successRes } from '@/controllers/main';
import type { Actor, StaffRole } from '@/models/business/actor';
import type { StaffProfile } from '@/models/business/auth';
import type { ILoginDto } from '@/models/dto/auth';
import staffRepo from '@/repositories/staff';
import { jwtHelper, postAuditLog } from '@/utility';

// hash หลอก — ใช้ verify ตอนไม่พบ username เพื่อให้เวลาตอบใกล้เคียงกัน (กันเดาว่า username ไหนมีอยู่จริง)
const DUMMY_HASH = await Bun.password.hash('dummy-password-for-timing');

// ข้อความเดียวกันทุกกรณี — ไม่บอกว่า username หรือรหัสผ่านผิด
const INVALID_MESSAGE = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';

export default async function login({ username, password }: ILoginDto): Promise<IReturnResponse<{ token: string; profile: StaffProfile } | null>> {
  try {
    const staff = await staffRepo.findByUsername(username);

    if (!staff || !staff.isActive) {
      await Bun.password.verify(password, DUMMY_HASH);
      await postAuditLog({ actor: { id: 'unknown', role: 'anonymous' }, action: 'login', result: 'denied', reason: 'invalid credentials' });
      return errRes.UNAUTHORIZED({ message: INVALID_MESSAGE });
    }

    const staffId = String(staff._id);
    const actor: Actor = { id: staffId, role: staff.role as StaffRole };

    if (staff.lockedUntil && staff.lockedUntil > new Date()) {
      await postAuditLog({ actor, action: 'login', result: 'denied', reason: 'account locked' });
      return errRes.ACCESS_DENIED({ message: 'บัญชีถูกล็อกชั่วคราวเนื่องจากใส่รหัสผ่านผิดหลายครั้ง กรุณาลองใหม่ภายหลัง' });
    }

    if (!(await Bun.password.verify(password, staff.passwordHash))) {
      const locked = await staffRepo.recordLogin.failure(staffId);
      await postAuditLog({ actor, action: 'login', result: 'denied', reason: locked ? 'invalid password, account locked' : 'invalid password' });
      return errRes.UNAUTHORIZED({ message: INVALID_MESSAGE });
    }

    await staffRepo.recordLogin.success(staffId);
    await postAuditLog({ actor, action: 'login', result: 'ok' });

    return successRes({
      token: jwtHelper.sign({ sub: staffId, ver: staff.sessionVersion ?? 0 }),
      profile: { id: staffId, username: staff.username, displayName: staff.displayName, role: staff.role as StaffRole },
    });
  } catch (error) {
    console.error('Login error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: 'An unexpected error occurred' });
  }
}
