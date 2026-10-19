import { errRes, successRes } from '@/controllers/main';
import type { ConsentDocumentView } from '@/models/business/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import { staffRefResolver, toDocumentView } from './helpers';

/** เวอร์ชันที่ใช้อยู่ — payload เป็น null ถ้ายังไม่เคยอัปโหลด */
export default async function getLatestDocument(): Promise<IReturnResponse<ConsentDocumentView | null>> {
  try {
    const doc = await consentDocumentRepo.getLatest();
    if (!doc) return successRes(null);

    const toStaff = await staffRefResolver([doc.uploadedBy.id]);
    return successRes(toDocumentView(doc, toStaff));
  } catch (error) {
    console.error('Consent document latest error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
