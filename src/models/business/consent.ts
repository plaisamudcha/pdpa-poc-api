import type { ConsentAction } from '@/externals/mongo/collections/consent.collection';
import type { Role } from './actor';

/**
 * สถานะความยินยอมของ user เทียบกับเอกสารเวอร์ชันล่าสุด
 *  - accepted:  ยอมรับเวอร์ชันล่าสุดแล้ว
 *  - outdated:  ยอมรับเวอร์ชันเก่า — มีเอกสารใหม่ ต้องยอมรับใหม่
 *  - withdrawn: ถอนความยินยอมแล้ว
 *  - none:      ยังไม่เคยยอมรับ
 */
export type ConsentStatus = 'accepted' | 'outdated' | 'withdrawn' | 'none';

export type StaffRef = { id: string; role: Role; username: string | null; displayName: string | null };

export type ConsentDocumentView = {
  id: string;
  version: number;
  title: string;
  note: string | null;
  fileName: string;
  fileSize: number;
  sha256: string;
  uploadedBy: StaffRef;
  createdAt: Date;
};

export type ConsentSummary = { status: ConsentStatus; version: number | null; latestVersion: number | null };

export type ConsentRecordView = {
  id: string;
  action: ConsentAction;
  version: number;
  reason: string | null;
  recordedBy: StaffRef;
  createdAt: Date;
};

export type UserConsentView = ConsentSummary & {
  userId: string;
  latestDocument: ConsentDocumentView | null;
  history: ConsentRecordView[];
};
