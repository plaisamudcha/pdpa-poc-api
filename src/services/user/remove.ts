import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { postAuditLog } from '@/utility';
import { can } from './helpers';

/**
 * สิทธิขอลบ (มาตรา 33) — crypto-shredding
 * 1. ทำลาย DEK → ciphertext ที่ค้างอยู่ทุกที่ (รวม backup) อ่านไม่ได้อีก
 * 2. ลบ ciphertext + blind index ออกจาก document
 */
export default async function remove(id: string, actor: Actor, reason: string): Promise<IReturnResponse<{ id: string } | null>> {
  if (!can(actor, 'erase')) {
    await postAuditLog({ actor, action: 'erase', subjectId: id, result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  try {
    const doc = await userRepo.getById(id);
    if (!doc) return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });

    await dataKeyRepo.destroy(id);
    await userRepo.erase(id);

    await postAuditLog({ actor, action: 'erase', subjectId: id, reason, result: 'ok' });
    return successRes({ id });
  } catch (error) {
    console.error('User remove error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
