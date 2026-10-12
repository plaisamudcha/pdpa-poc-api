import type { Role } from '@/models/business/actor';

/** Data classification — field ที่เป็นข้อมูลส่วนบุคคล (encrypt ทุก field) */
export const PII_FIELDS = ['firstName', 'lastName', 'email', 'citizenId', 'phone', 'address', 'healthNote'] as const;
export type PiiField = (typeof PII_FIELDS)[number];

/** ข้อมูลอ่อนไหวตามมาตรา 26 — ไม่ถอดรหัสเลยถ้า role ไม่มีสิทธิ์ */
export const SENSITIVE_FIELDS: ReadonlySet<PiiField> = new Set(['healthNote']);

/**
 * Access policy ตาม role ของพนักงานที่ login (role อ่านจาก collection staffs ทุก request)
 *  - reveal: none = เห็นแบบ mask, pii = เห็น PII ทั่วไป, all = เห็นทั้งหมดรวมข้อมูลอ่อนไหว
 */
export const ROLE_POLICY: Record<Role, { reveal: 'none' | 'pii' | 'all'; create: boolean; update: boolean; erase: boolean; export: boolean; audit: boolean }> = {
  support: { reveal: 'none', create: true, update: false, erase: false, export: false, audit: false },
  admin: { reveal: 'pii', create: true, update: true, erase: false, export: false, audit: false },
  dpo: { reveal: 'all', create: true, update: true, erase: true, export: true, audit: true },
  system: { reveal: 'none', create: false, update: false, erase: true, export: false, audit: false },
  anonymous: { reveal: 'none', create: false, update: false, erase: false, export: false, audit: false },
};

/** role ที่กำหนดให้บัญชีพนักงานได้ (system/anonymous ใช้ภายในเท่านั้น) */
export const STAFF_ROLES = ['support', 'admin', 'dpo'] as const;
