import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { UserView } from '@/models/business/user';
import consentRepo from '@/repositories/consent';
import consentDocumentRepo from '@/repositories/consentDocument';
import dataKeyRepo from '@/repositories/dataKey';
import userRepo from '@/repositories/user';
import { consentSummary } from '@/services/consent/helpers';
import { blindIndex, postAuditLog } from '@/utility';
import { PREFIX_MIN } from '@/utility/crypto/blindIndex';
import { decryptView } from './helpers';

export const SEARCH_HINT = 'ค้นหาได้ด้วย อีเมลเต็ม, เลขบัตรประชาชน 13 หลัก, 4 ตัวท้ายของเบอร์โทร/เลขบัตร หรือ 3 ตัวแรกขึ้นไปของชื่อ/นามสกุล/อีเมล';

/**
 * แปลงคำค้นเป็นเงื่อนไขบน searchIdx (blind index) — field ที่ encrypt ค้นด้วย regex ไม่ได้
 *  - มี @              → อีเมลตรงตัว
 *  - ตัวเลข 13 หลัก     → เลขบัตรตรงตัว
 *  - ตัวเลข 4 หลัก      → 4 ตัวท้ายเบอร์โทร หรือเลขบัตร
 *  - ข้อความ ≥ 3 ตัว    → ขึ้นต้นด้วย (ชื่อ / นามสกุล / อีเมลส่วนหน้า @) — ยาวเกิน 5 ตัวจะถูกตัดเหลือ 5
 */
function resolveSearch(search?: string): Record<string, unknown> | null {
  const { index, normalize, prefixQuery, length } = blindIndex;
  const s = search?.trim();
  if (!s) return {};

  if (s.includes('@')) return { 'searchIdx.email': index('email', normalize.email(s)) };

  if (/^[\d\s-]+$/.test(s)) {
    const digits = normalize.digits(s);
    if (digits.length === 13) return { 'searchIdx.citizenId': index('citizenId', digits) };
    if (digits.length === 4) {
      return { $or: [{ 'searchIdx.phoneLast4': index('phone-last4', digits) }, { 'searchIdx.citizenIdLast4': index('citizenId-last4', digits) }] };
    }
    return null;
  }

  const text = normalize.text(s);
  if (length(text) < PREFIX_MIN) return null;
  const q = prefixQuery(text);
  return {
    $or: [
      { 'searchIdx.firstNamePrefix': index('firstName-prefix', q) },
      { 'searchIdx.lastNamePrefix': index('lastName-prefix', q) },
      { 'searchIdx.emailPrefix': index('email-prefix', q) },
    ],
  };
}

/** รายการ user — แสดงแบบ mask เสมอ (ไม่ว่า role ไหน) */
export default async function list(
  { search, desc, page, pageSize }: IQueryList<null> & { page: number; pageSize: number },
  actor: Actor
): Promise<IReturnResponse<IPagination<UserView> | null>> {
  const filter = resolveSearch(search);
  if (filter === null) {
    return errRes.BAD_REQUEST({ message: SEARCH_HINT });
  }

  try {
    const result = await userRepo.list({ page, pageSize, desc, filter });

    // สถานะความยินยอมของ user ในหน้านี้ เทียบกับเอกสารเวอร์ชันล่าสุด
    const [latestDoc, consents] = await Promise.all([
      consentDocumentRepo.getLatest(),
      consentRepo.latestByUsers(result.datas.map((doc) => String(doc._id))),
    ]);
    const consentByUser = new Map(consents.map((c) => [c.userId, c]));

    const datas = await Promise.all(
      result.datas.map(async (doc) => {
        const userId = String(doc._id);
        const dek = await dataKeyRepo.getDek(userId);
        if (!dek) throw new Error(`Data key missing for active user ${userId}`);
        const { view } = decryptView(doc, dek, userId, 'none');
        return {
          id: userId,
          ...view,
          revealed: [],
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          retentionUntil: doc.retentionUntil,
          consent: consentSummary(consentByUser.get(userId), latestDoc?.version ?? null),
        };
      })
    );

    await postAuditLog({ actor, action: search ? 'search' : 'list', result: 'ok' });
    return successRes({ ...result, datas });
  } catch (error) {
    console.error('User list error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
