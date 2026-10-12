import type { Actor } from '@/models/business/actor';
import type { StaffProfile } from '@/models/business/auth';

declare global {
  namespace Express {
    interface Request {
      // ใส่โดย middleware/authentication หลังตรวจ JWT แล้ว
      actor: Actor;
      staff: StaffProfile;
    }
  }
}

export {};
