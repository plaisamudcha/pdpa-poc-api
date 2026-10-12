import type { Actor } from '@/models/business/actor';
import userRepo from '@/repositories/user';
import remove from './remove';

/** ลบข้อมูลที่เกินระยะเวลาเก็บ (data retention) — เรียกจาก job */
export default async function purgeExpired(now = new Date()): Promise<number> {
  const system: Actor = { id: 'retention-job', role: 'system' };
  const ids = await userRepo.listExpiredIds(now);

  for (const id of ids) {
    await remove(id, system, 'retention period expired');
  }

  return ids.length;
}
