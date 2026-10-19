import consentDocumentRepo from '@/repositories/consentDocument';

/** เปิด stream ไฟล์ PDF ของเวอร์ชันที่ระบุ — null ถ้าไม่มีเวอร์ชันนั้น */
export default async function getDocumentFile(version: number) {
  const doc = await consentDocumentRepo.getByVersion(version);
  if (!doc) return null;

  return { doc, stream: await consentDocumentRepo.openFile(doc.fileId) };
}
