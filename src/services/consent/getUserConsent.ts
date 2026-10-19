import { errRes, successRes } from '@/controllers/main';
import type { UserConsentView } from '@/models/business/consent';
import consentRepo from '@/repositories/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import userRepo from '@/repositories/user';
import { consentSummary, staffRefResolver, toDocumentView } from './helpers';

/** สถานะความยินยอม + ประวัติทั้งหมดของ user (ไม่มี PII จึงไม่ต้องถอดรหัส) */
export default async function getUserConsent(userId: string): Promise<IReturnResponse<UserConsentView | null>> {
  try {
    const user = await userRepo.getById(userId);
    if (!user) return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });

    const [latest, history] = await Promise.all([consentDocumentRepo.getLatest(), consentRepo.listByUser(userId)]);
    const toStaff = await staffRefResolver([...history.map((r) => r.recordedBy.id), ...(latest ? [latest.uploadedBy.id] : [])]);

    return successRes({
      userId,
      ...consentSummary(history[0], latest?.version ?? null),
      latestDocument: latest ? toDocumentView(latest, toStaff) : null,
      history: history.map((r) => ({
        id: String(r._id),
        action: r.action,
        version: r.version,
        reason: r.reason ?? null,
        recordedBy: toStaff(r.recordedBy),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('User consent get error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
