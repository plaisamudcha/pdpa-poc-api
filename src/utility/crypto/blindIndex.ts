import { cipher, createBlindIndex } from '@pdpa/crypto';
import config from '@/config';

/**
 * label แยกประเภท token — ค่าเดียวกันแต่คนละประเภทจะได้ HMAC ต่างกัน
 * (เช่น prefix "som" ของอีเมล กับ prefix "som" ของชื่อ)
 */
type IndexLabel = 'email' | 'email-prefix' | 'citizenId' | 'citizenId-last4' | 'phone-last4' | 'firstName-prefix' | 'lastName-prefix';

/** prefix ที่ทำ index 3–5 ตัว (นับเป็น code point) — ค้นด้วยคำที่ยาวกว่า PREFIX_MAX จะถูกตัดเหลือ PREFIX_MAX */
const blindIndex = createBlindIndex<IndexLabel>({ key: cipher.decodeKey(config.encryption.BLIND_INDEX_KEY, 'BLIND_INDEX_KEY') });

export const { PREFIX_MIN, PREFIX_MAX } = blindIndex;

export default blindIndex;
