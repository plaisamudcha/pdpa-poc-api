import { Types } from 'mongoose';
import config from '@/config';
import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { ICreateUserDto } from '@/models/dto/user/create';
import consentRepo from '@/repositories/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
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
  let consentId: string | undefined;

  try {
    // มีเอกสาร PDPA ในระบบแล้ว → เจ้าของข้อมูลต้องยอมรับเวอร์ชันล่าสุดก่อนเก็บข้อมูล
    const latestDoc = await consentDocumentRepo.getLatest();
    if (latestDoc && data.consentVersion === undefined) {
      return errRes.BAD_REQUEST({ message: `กรุณาให้เจ้าของข้อมูลยอมรับเอกสาร PDPA เวอร์ชัน ${latestDoc.version} ก่อน` });
    }
    if (latestDoc && data.consentVersion !== latestDoc.version) {
      return errRes.CONFLICT({ message: `มีเอกสารเวอร์ชันใหม่ (v${latestDoc.version}) กรุณาเปิดให้เจ้าของข้อมูลอ่านอีกครั้ง` });
    }

    const dek = await dataKeyRepo.create(userId);
    dekCreated = true;

    // บันทึกความยินยอมก่อน user — ถ้าสร้าง user ไม่สำเร็จจะลบทิ้งได้ (ไม่มี user ที่ไม่มีความยินยอม)
    if (latestDoc) {
      const consent = await consentRepo.create({
        userId,
        action: 'accept',
        documentId: latestDoc._id,
        version: latestDoc.version,
        reason: null,
        recordedBy: { id: actor.id, role: actor.role },
      });
      consentId = String(consent._id);
    }

    await userRepo.create({
      _id,
      searchIdx: buildSearchIdx(pii),
      pii: encryptFields(dek, userId, pii),
      retentionUntil: new Date(Date.now() + config.pdpa.RETENTION_DAYS * 86_400_000),
    });

    await postAuditLog({ actor, action: 'create', subjectId: userId, result: 'ok' });
    if (latestDoc) {
      await postAuditLog({ actor, action: 'consent', subjectId: userId, reason: `เอกสาร PDPA เวอร์ชัน ${latestDoc.version}`, result: 'ok' });
    }
    return successRes({ id: userId });
  } catch (error) {
    // ไม่ทิ้ง DEK / ความยินยอมกำพร้าไว้ เช่นกรณี email/เลขบัตรซ้ำ
    if (dekCreated) await dataKeyRepo.destroy(userId);
    if (consentId) await consentRepo.removeById(consentId);

    if (isDuplicateKeyError(error)) {
      return errRes.CONFLICT({ message: 'อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
    }
    console.error('User create error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
