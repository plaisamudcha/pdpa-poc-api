import { PII_FIELDS, ROLE_POLICY, SENSITIVE_FIELDS, type PiiField } from '@/constant/pdpa';
import type { TypeSearchIdx, TypeUser } from '@/externals/mongo/collections/user.collection';
import type { Actor } from '@/models/business/actor';
import type { IUpdateUserDto } from '@/models/dto/user/update';
import { blindIndex, cipher, mask } from '@/utility';

type PiiValues = Partial<Record<PiiField, string>>;
type RevealLevel = (typeof ROLE_POLICY)[keyof typeof ROLE_POLICY]['reveal'];

/** AAD ผูก ciphertext กับ user + field */
export const aad = (userId: string, field: PiiField) => `${userId}:${field}`;

/** เก็บเฉพาะ field ที่เป็น PII และตัดค่าว่างทิ้ง */
export function pickPii(data: IUpdateUserDto): PiiValues {
  const out: PiiValues = {};
  for (const field of PII_FIELDS) {
    const value = data[field];
    if (typeof value === 'string' && value.trim() !== '') out[field] = value.trim();
  }
  return out;
}

export function encryptFields(dek: Buffer, userId: string, data: PiiValues): PiiValues {
  const out: PiiValues = {};
  for (const field of PII_FIELDS) {
    const value = data[field];
    if (value !== undefined) out[field] = cipher.encrypt(dek, value, aad(userId, field));
  }
  return out;
}

/**
 * สร้าง searchIdx จาก field ที่ส่งมา (คืนเฉพาะ key ที่เกี่ยวกับ field นั้น — ใช้ได้ทั้งตอนสร้างและแก้ไข)
 *  - email      → email (ตรงตัว, unique) + emailPrefix (3–5 ตัวแรกของส่วนหน้า @)
 *  - citizenId  → citizenId (ตรงตัว, unique) + citizenIdLast4
 *  - phone      → phoneLast4
 *  - first/lastName → *Prefix (3–5 ตัวแรก)
 */
export function buildSearchIdx(data: PiiValues): Partial<TypeSearchIdx> {
  const { index, prefixes, normalize } = blindIndex;
  const idx: Partial<TypeSearchIdx> = {};

  if (data.email) {
    const email = normalize.email(data.email);
    idx.email = index('email', email);
    idx.emailPrefix = prefixes(email.split('@')[0] ?? '').map((p) => index('email-prefix', p));
  }
  if (data.citizenId) {
    const digits = normalize.digits(data.citizenId);
    idx.citizenId = index('citizenId', digits);
    idx.citizenIdLast4 = index('citizenId-last4', digits.slice(-4));
  }
  if (data.phone) {
    idx.phoneLast4 = index('phone-last4', normalize.digits(data.phone).slice(-4));
  }
  if (data.firstName) {
    idx.firstNamePrefix = prefixes(normalize.text(data.firstName)).map((p) => index('firstName-prefix', p));
  }
  if (data.lastName) {
    idx.lastNamePrefix = prefixes(normalize.text(data.lastName)).map((p) => index('lastName-prefix', p));
  }

  return idx;
}

/**
 * ถอดรหัสตามระดับสิทธิ์
 *  - all: เห็นทุก field
 *  - pii: เห็น PII ทั่วไป แต่ข้อมูลอ่อนไหวเป็น [REDACTED]
 *  - none: เห็นแบบ mask, ข้อมูลอ่อนไหวเป็น [REDACTED] (ไม่ถอดรหัสเลย)
 */
export function decryptView(doc: Pick<TypeUser, 'pii'>, dek: Buffer, userId: string, level: RevealLevel) {
  const view: PiiValues = {};
  const revealed: PiiField[] = [];
  const pii = (doc.pii ?? {}) as PiiValues;

  for (const field of PII_FIELDS) {
    const ct = pii[field];
    if (!ct) continue;
    const sensitive = SENSITIVE_FIELDS.has(field);

    if (level === 'all' || (level === 'pii' && !sensitive)) {
      view[field] = cipher.decrypt(dek, ct, aad(userId, field));
      revealed.push(field);
    } else if (sensitive) {
      view[field] = '[REDACTED]';
    } else {
      view[field] = mask(field, cipher.decrypt(dek, ct, aad(userId, field)));
    }
  }

  return { view, revealed };
}

export function can(actor: Actor, permission: 'create' | 'update' | 'erase' | 'export' | 'audit') {
  return ROLE_POLICY[actor.role][permission];
}

export function revealLevel(actor: Actor): RevealLevel {
  return ROLE_POLICY[actor.role].reveal;
}

export const isDuplicateKeyError = (error: unknown) => (error as { code?: number })?.code === 11000;
