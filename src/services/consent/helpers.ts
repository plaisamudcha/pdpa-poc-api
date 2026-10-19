import type { TypeConsentDocument } from '@/externals/mongo/collections/consent-document.collection';
import type { TypeConsent } from '@/externals/mongo/collections/consent.collection';
import type { Role } from '@/models/business/actor';
import type { ConsentDocumentView, ConsentSummary, StaffRef } from '@/models/business/consent';
import staffRepo from '@/repositories/staff';

/** สถานะปัจจุบัน = record ล่าสุดของ user เทียบกับเวอร์ชันล่าสุดของเอกสาร */
export function consentSummary(last: Pick<TypeConsent, 'action' | 'version'> | null | undefined, latestVersion: number | null): ConsentSummary {
  if (!last) return { status: 'none', version: null, latestVersion };
  if (last.action === 'withdraw') return { status: 'withdrawn', version: last.version, latestVersion };
  return { status: last.version === latestVersion ? 'accepted' : 'outdated', version: last.version, latestVersion };
}

/** ไฟล์ PDF ขึ้นต้นด้วย "%PDF-" เสมอ — ไม่เชื่อ Content-Type ที่ client ส่งมา */
export const isPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

/** เติมชื่อพนักงานตอนแสดงผล (เก็บแค่ id/role เหมือน audit log) */
export async function staffRefResolver(ids: string[]) {
  const staffs = await staffRepo.findByIds(ids);
  const byId = new Map(staffs.map((s) => [String(s._id), s]));

  return ({ id, role }: { id: string; role: string }): StaffRef => {
    const staff = byId.get(id);
    return { id, role: role as Role, username: staff?.username ?? null, displayName: staff?.displayName ?? null };
  };
}

export function toDocumentView(doc: TypeConsentDocument, toStaff: (ref: { id: string; role: string }) => StaffRef): ConsentDocumentView {
  return {
    id: String(doc._id),
    version: doc.version,
    title: doc.title,
    note: doc.note ?? null,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    sha256: doc.sha256,
    uploadedBy: toStaff(doc.uploadedBy),
    createdAt: doc.createdAt,
  };
}
