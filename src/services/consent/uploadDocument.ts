import { createHash } from 'node:crypto';
import type { Types } from 'mongoose';
import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { ConsentDocumentView } from '@/models/business/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import { can, isDuplicateKeyError } from '@/services/user/helpers';
import { postAuditLog } from '@/utility';
import { isPdf, staffRefResolver, toDocumentView } from './helpers';

const MAX_VERSION_RETRY = 3;

/**
 * อัปโหลดเอกสาร PDPA — เลขเวอร์ชัน = เวอร์ชันล่าสุด + 1 อัตโนมัติ
 * เวอร์ชันใหม่มีผลทันที: user ที่ยอมรับเวอร์ชันเก่าจะมีสถานะ "ต้องยอมรับใหม่"
 */
export default async function uploadDocument(
  { title, note, fileName, buffer }: { title: string; note?: string; fileName?: string; buffer: Buffer },
  actor: Actor
): Promise<IReturnResponse<ConsentDocumentView | null>> {
  if (!can(actor, 'document')) {
    await postAuditLog({ actor, action: 'upload_document', result: 'denied' });
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }
  if (!isPdf(buffer)) {
    return errRes.BAD_REQUEST({ message: 'ไฟล์ต้องเป็น PDF เท่านั้น' });
  }

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  let fileId: Types.ObjectId | undefined;

  try {
    const latest = await consentDocumentRepo.getLatest();
    if (latest?.sha256 === sha256) {
      return errRes.CONFLICT({ message: `ไฟล์นี้เหมือนกับเวอร์ชันล่าสุด (v${latest.version})` });
    }

    fileId = await consentDocumentRepo.uploadFile(fileName || 'pdpa.pdf', buffer, { sha256 });

    // อัปโหลดพร้อมกัน 2 คนอาจได้เลขเดียวกัน — unique index จะปฏิเสธคนหลัง แล้วลองเลขถัดไป
    for (let attempt = 1; ; attempt++) {
      const current = await consentDocumentRepo.getLatest();
      const version = (current?.version ?? 0) + 1;

      try {
        const doc = await consentDocumentRepo.create({
          version,
          title,
          note: note || null,
          fileId,
          fileName: fileName || `pdpa-v${version}.pdf`,
          fileSize: buffer.length,
          sha256,
          uploadedBy: { id: actor.id, role: actor.role },
        });

        await postAuditLog({ actor, action: 'upload_document', reason: `เอกสาร PDPA เวอร์ชัน ${version}`, result: 'ok' });
        const toStaff = await staffRefResolver([actor.id]);
        return successRes(toDocumentView(doc.toObject(), toStaff));
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt >= MAX_VERSION_RETRY) throw error;
      }
    }
  } catch (error) {
    // ไม่ทิ้งไฟล์กำพร้าไว้ใน GridFS
    if (fileId) await consentDocumentRepo.deleteFile(fileId).catch(() => undefined);

    console.error('Consent document upload error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
