import { Types } from 'mongoose';
import config from '@/config';
import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { ICreateUserDto } from '@/models/dto/user/create';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { postAuditLog } from '@/utility';
import { buildSearchIdx, can, encryptFields, isDuplicateKeyError, pickPii } from './helpers';

export default async function create(data: ICreateUserDto, actor: Actor): Promise<IReturnResponse<{ id: string } | null>> {
  if (!can(actor, 'create')) {
    await postAuditLog({ actor, action: 'create', result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  const _id = new Types.ObjectId();
  const userId = _id.toHexString();
  const pii = pickPii(data);
  let dekCreated = false;

  try {
    const dek = await dataKeyRepo.create(userId);
    dekCreated = true;

    await userRepo.create({
      _id,
      searchIdx: buildSearchIdx(pii),
      pii: encryptFields(dek, userId, pii),
      retentionUntil: new Date(Date.now() + config.pdpa.RETENTION_DAYS * 86_400_000),
    });

    await postAuditLog({ actor, action: 'create', subjectId: userId, result: 'ok' });
    return successRes({ id: userId });
  } catch (error) {
    // ไม่ทิ้ง DEK กำพร้าไว้ เช่นกรณี email/เลขบัตรซ้ำ
    if (dekCreated) await dataKeyRepo.destroy(userId);

    if (isDuplicateKeyError(error)) {
      return errRes.CONFLICT({ message: 'อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
    }
    console.error('User create error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
