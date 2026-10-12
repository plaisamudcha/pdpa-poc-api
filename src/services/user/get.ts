import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { UserView } from '@/models/business/user';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { postAuditLog } from '@/utility';
import { decryptView, revealLevel } from './helpers';

/**
 * อ่านข้อมูล user — mask เป็นค่าเริ่มต้น
 * reveal=true จะเปิดเต็มเฉพาะ field ที่ role มีสิทธิ์ และต้องระบุเหตุผล (บันทึกใน audit log)
 */
export default async function get(
  id: string,
  actor: Actor,
  { reveal = false, reason }: { reveal?: boolean; reason?: string }
): Promise<IReturnResponse<UserView | null>> {
  if (reveal && !reason?.trim()) {
    return errRes.BAD_REQUEST({ message: 'กรุณาระบุเหตุผลในการเปิดดูข้อมูล' });
  }

  try {
    const doc = await userRepo.getById(id);
    if (!doc) {
      await postAuditLog({ actor, action: 'read', subjectId: id, result: 'not_found' });
      return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const dek = await dataKeyRepo.getDek(id);
    if (!dek) throw new Error(`Data key missing for active user ${id}`);

    const { view, revealed } = decryptView(doc, dek, id, reveal ? revealLevel(actor) : 'none');

    await postAuditLog({ actor, action: 'read', subjectId: id, fields: revealed, reason: reason ?? null, result: 'ok' });
    return successRes({ id, ...view, revealed, createdAt: doc.createdAt, updatedAt: doc.updatedAt, retentionUntil: doc.retentionUntil });
  } catch (error) {
    console.error('User get error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
