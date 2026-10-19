import { errRes, successRes } from '@/controllers/main';
import type { ConsentAction } from '@/externals/mongo/collections/consent.collection';
import type { Actor } from '@/models/business/actor';
import consentRepo from '@/repositories/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import userRepo from '@/repositories/user';
import { can } from '@/services/user/helpers';
import { postAuditLog } from '@/utility';
import { consentSummary } from './helpers';

/**
 * staff บันทึกการยอมรับ / ถอนความยินยอมแทนเจ้าของข้อมูล
 *  - accept:   ต้องเป็นเวอร์ชันล่าสุดเท่านั้น (ส่ง version ที่เปิดให้เจ้าของข้อมูลอ่านมา — ถ้ามีเวอร์ชันใหม่ระหว่างนั้นจะถูกปฏิเสธ)
 *  - withdraw: ถอนได้ตลอดเวลา (มาตรา 19 วรรคห้า) ต้องระบุเหตุผล
 */
export default async function recordUserConsent(
  userId: string,
  { action, version, reason }: { action: ConsentAction; version?: number; reason?: string },
  actor: Actor
): Promise<IReturnResponse<{ id: string } | null>> {
  const auditAction = action === 'accept' ? 'consent' : 'withdraw_consent';

  if (!can(actor, 'consent')) {
    await postAuditLog({ actor, action: auditAction, subjectId: userId, result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  try {
    const user = await userRepo.getById(userId);
    if (!user) {
      await postAuditLog({ actor, action: auditAction, subjectId: userId, result: 'not_found' });
      return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const [latest, history] = await Promise.all([consentDocumentRepo.getLatest(), consentRepo.listByUser(userId)]);
    if (!latest) return errRes.BAD_REQUEST({ message: 'ยังไม่มีเอกสาร PDPA ในระบบ' });

    const last = history[0];
    const { status } = consentSummary(last, latest.version);

    if (action === 'accept') {
      if (version !== latest.version) {
        return errRes.CONFLICT({ message: `มีเอกสารเวอร์ชันใหม่ (v${latest.version}) กรุณาเปิดให้เจ้าของข้อมูลอ่านอีกครั้ง` });
      }
      if (status === 'accepted') return errRes.CONFLICT({ message: `ยอมรับเอกสารเวอร์ชัน ${latest.version} แล้ว` });

      const record = await consentRepo.create({
        userId,
        action,
        documentId: latest._id,
        version: latest.version,
        reason: null,
        recordedBy: { id: actor.id, role: actor.role },
      });
      await postAuditLog({ actor, action: auditAction, subjectId: userId, reason: `เอกสาร PDPA เวอร์ชัน ${latest.version}`, result: 'ok' });
      return successRes({ id: String(record._id) });
    }

    if (!last || last.action !== 'accept') {
      return errRes.BAD_REQUEST({ message: 'ยังไม่มีความยินยอมที่ถอนได้' });
    }
    if (!reason?.trim()) return errRes.BAD_REQUEST({ message: 'กรุณาระบุเหตุผลในการถอนความยินยอม' });

    // ถอนความยินยอมของเวอร์ชันที่ยอมรับไว้ (อาจเป็นเวอร์ชันเก่า)
    const record = await consentRepo.create({
      userId,
      action,
      documentId: last.documentId,
      version: last.version,
      reason: reason.trim(),
      recordedBy: { id: actor.id, role: actor.role },
    });
    await postAuditLog({ actor, action: auditAction, subjectId: userId, reason: reason.trim(), result: 'ok' });
    return successRes({ id: String(record._id) });
  } catch (error) {
    console.error('User consent record error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
