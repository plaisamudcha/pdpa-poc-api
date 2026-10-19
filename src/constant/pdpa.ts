import type { Role } from '@/models/business/actor';

/** Data classification — field ที่เป็นข้อมูลส่วนบุคคล (encrypt ทุก field) */
export const PII_FIELDS = ['firstName', 'lastName', 'email', 'citizenId', 'phone', 'address', 'healthNote'] as const;
export type PiiField = (typeof PII_FIELDS)[number];

/** ข้อมูลอ่อนไหวตามมาตรา 26 — ไม่ถอดรหัสเลยถ้า role ไม่มีสิทธิ์ */
export const SENSITIVE_FIELDS: ReadonlySet<PiiField> = new Set(['healthNote']);

/**
 * Access policy ตาม role ของพนักงานที่ login (role อ่านจาก collection staffs ทุก request)
 *  - reveal: none = เห็นแบบ mask, pii = เห็น PII ทั่วไป, all = เห็นทั้งหมดรวมข้อมูลอ่อนไหว
 *  - consent: บันทึกการยอมรับ / ถอนความยินยอมแทนเจ้าของข้อมูล
 *  - document: อัปโหลดเอกสาร PDPA เวอร์ชันใหม่
 */
export const ROLE_POLICY: Record<
  Role,
  { reveal: 'none' | 'pii' | 'all'; create: boolean; update: boolean; erase: boolean; export: boolean; audit: boolean; consent: boolean; document: boolean }
> = {
  support: { reveal: 'none', create: true, update: false, erase: false, export: false, audit: false, consent: true, document: false },
  admin: { reveal: 'pii', create: true, update: true, erase: false, export: false, audit: false, consent: true, document: false },
  dpo: { reveal: 'all', create: true, update: true, erase: true, export: true, audit: true, consent: true, document: true },
  system: { reveal: 'none', create: false, update: false, erase: true, export: false, audit: false, consent: false, document: false },
  anonymous: { reveal: 'none', create: false, update: false, erase: false, export: false, audit: false, consent: false, document: false },
};

/** ขนาดไฟล์ PDF สูงสุดของเอกสาร PDPA */
export const MAX_CONSENT_FILE_MB = 10;

/** role ที่กำหนดให้บัญชีพนักงานได้ (system/anonymous ใช้ภายในเท่านั้น) */
export const STAFF_ROLES = ['support', 'admin', 'dpo'] as const;
