import { createHmac } from 'node:crypto';
import config from '@/config';
import cipher from './cipher';

/**
 * Blind index = HMAC-SHA256(key, "<label>:<normalized value>")
 * ใช้ค้นหา/ทำ unique index บน field ที่ถูก encrypt
 * ต้องใช้ HMAC ที่มี secret key — ห้ามใช้ SHA256 เปล่า เพราะเลขบัตร 13 หลัก brute force ได้
 * key นี้ต้องแยกจาก KEK/DEK
 */
const key = cipher.decodeKey(config.encryption.BLIND_INDEX_KEY, 'BLIND_INDEX_KEY');

/** ความยาว prefix ที่ทำ index (นับเป็น code point) — ค้นด้วยคำที่ยาวกว่า PREFIX_MAX จะถูกตัดเหลือ PREFIX_MAX */
export const PREFIX_MIN = 3;
export const PREFIX_MAX = 5;

/**
 * label แยกประเภท token — ค่าเดียวกันแต่คนละประเภทจะได้ HMAC ต่างกัน
 * (เช่น prefix "som" ของอีเมล กับ prefix "som" ของชื่อ)
 */
type IndexLabel = 'email' | 'email-prefix' | 'citizenId' | 'citizenId-last4' | 'phone-last4' | 'firstName-prefix' | 'lastName-prefix';

const normalize = {
  email: (v: string) => v.trim().toLowerCase(),
  digits: (v: string) => v.replace(/\D/g, ''),
  text: (v: string) => v.trim().normalize('NFC').toLowerCase(),
};

/** HMAC ของค่าที่ normalize แล้ว */
function index(label: IndexLabel, normalized: string): string {
  return createHmac('sha256', key).update(`${label}:${normalized}`).digest('base64url');
}

/** "สมชาย" → ["สมช", "สมชา", "สมชาย"] — ตัดตาม code point (ภาษาไทยสระ/วรรณยุกต์นับเป็น 1 ตัว) */
function prefixes(normalized: string): string[] {
  const chars = Array.from(normalized);
  const out: string[] = [];
  for (let len = PREFIX_MIN; len <= Math.min(PREFIX_MAX, chars.length); len += 1) {
    out.push(chars.slice(0, len).join(''));
  }
  return out;
}

/** ตัดคำค้นให้ยาวไม่เกิน PREFIX_MAX (เพราะ index เก็บไว้แค่นั้น) */
function prefixQuery(normalized: string): string {
  return Array.from(normalized).slice(0, PREFIX_MAX).join('');
}

const length = (v: string) => Array.from(v).length;

export default { index, prefixes, prefixQuery, normalize, length };
