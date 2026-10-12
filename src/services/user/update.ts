import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { IUpdateUserDto } from '@/models/dto/user/update';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { postAuditLog } from '@/utility';
import { buildSearchIdx, can, encryptFields, isDuplicateKeyError, pickPii } from './helpers';

/** สิทธิขอแก้ไขข้อมูล (มาตรา 35) — encrypt เฉพาะ field ที่ส่งมา */
export default async function update(id: string, data: IUpdateUserDto, actor: Actor): Promise<IReturnResponse<{ id: string } | null>> {
  if (!can(actor, 'update')) {
    await postAuditLog({ actor, action: 'update', subjectId: id, result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  const pii = pickPii(data);
  if (Object.keys(pii).length === 0) {
    return errRes.BAD_REQUEST({ message: 'ไม่มีข้อมูลที่ต้องแก้ไข' });
  }

  try {
    const doc = await userRepo.getById(id);
    if (!doc) return errRes.DATA_NOT_FOUND({ message: 'ไม่พบข้อมูลผู้ใช้' });

    const dek = await dataKeyRepo.getDek(id);
    if (!dek) throw new Error(`Data key missing for active user ${id}`);

    // dot notation — ทับเฉพาะ field ที่แก้ ทั้งใน pii และ searchIdx
    const $set: Record<string, unknown> = {};
    for (const [field, ct] of Object.entries(encryptFields(dek, id, pii))) $set[`pii.${field}`] = ct;
    for (const [key, value] of Object.entries(buildSearchIdx(pii))) $set[`searchIdx.${key}`] = value;
    await userRepo.update(id, $set);

    await postAuditLog({ actor, action: 'update', subjectId: id, fields: Object.keys(pii), result: 'ok' });
    return successRes({ id });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return errRes.CONFLICT({ message: 'อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
    }
    console.error('User update error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
