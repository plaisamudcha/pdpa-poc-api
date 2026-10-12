import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { UserExport } from '@/models/business/user';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { postAuditLog } from '@/utility';
import { can, decryptView } from './helpers';

/** สิทธิขอรับสำเนา / โอนย้ายข้อมูล (มาตรา 30, 31) — export เป็น JSON ที่อ่านด้วยเครื่องได้ */
export default async function exportData(id: string, actor: Actor): Promise<IReturnResponse<UserExport | null>> {
  if (!can(actor, 'export')) {
    await postAuditLog({ actor, action: 'export', subjectId: id, result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  try {
    const doc = await userRepo.getById(id);
    if (!doc) return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });

    const dek = await dataKeyRepo.getDek(id);
    if (!dek) throw new Error(`Data key missing for active user ${id}`);

    const { view, revealed } = decryptView(doc, dek, id, 'all');

    await postAuditLog({ actor, action: 'export', subjectId: id, fields: revealed, result: 'ok' });
    return successRes({
      userId: id,
      exportedAt: new Date().toISOString(),
      data: view,
      metadata: { createdAt: doc.createdAt, updatedAt: doc.updatedAt, retentionUntil: doc.retentionUntil },
    });
  } catch (error) {
    console.error('User export error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
