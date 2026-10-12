import auditLogRepo from '@/repositories/auditLog';
import type { TypeAuditLog } from '@/externals/mongo/collections/audit-log.collection';

type AuditEntry = Pick<TypeAuditLog, 'actor' | 'action' | 'result'> & Partial<Pick<TypeAuditLog, 'subjectId' | 'fields' | 'reason'>>;

/**
 * บันทึก audit log ของการเข้าถึงข้อมูลส่วนบุคคล — ห้ามใส่ PII plaintext ลงใน log
 * ไม่ throw ออกไป เพื่อไม่ให้ request หลักล้มเพราะ log ล้ม
 */
export async function postAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await auditLogRepo.create(entry);
  } catch (error) {
    console.error('postAuditLog error:', error);
  }
}
