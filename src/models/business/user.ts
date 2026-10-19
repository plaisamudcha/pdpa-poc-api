import type { PiiField } from '@/constant/pdpa';
import type { ConsentSummary } from './consent';

/** ข้อมูล user หลัง decrypt — ค่าของแต่ละ field อาจถูก mask หรือเป็น [REDACTED] ตามสิทธิ์ */
export type UserView = {
  id: string;
  revealed: PiiField[];
  createdAt: Date;
  updatedAt: Date;
  retentionUntil: Date;
  // มีเฉพาะในหน้ารายการ
  consent?: ConsentSummary;
} & Partial<Record<PiiField, string>>;

export type UserExport = {
  userId: string;
  exportedAt: string;
  data: Partial<Record<PiiField, string>>;
  metadata: { createdAt: Date; updatedAt: Date; retentionUntil: Date };
};
