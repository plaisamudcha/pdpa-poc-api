import { errRes, successRes } from '@/controllers/main';
import type { ConsentDocumentView } from '@/models/business/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import { staffRefResolver, toDocumentView } from './helpers';

/** ทุกเวอร์ชัน ใหม่สุดก่อน — ตัวแรกคือเวอร์ชันที่ใช้อยู่ */
export default async function listDocuments(): Promise<IReturnResponse<ConsentDocumentView[] | null>> {
  try {
    const docs = await consentDocumentRepo.list();
    const toStaff = await staffRefResolver(docs.map((doc) => doc.uploadedBy.id));

    return successRes(docs.map((doc) => toDocumentView(doc, toStaff)));
  } catch (error) {
    console.error('Consent document list error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
