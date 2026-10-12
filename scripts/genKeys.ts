import { randomBytes } from 'node:crypto';

// สร้าง key สำหรับ .env (POC เท่านั้น — production ให้สร้าง/เก็บใน KMS หรือ Vault)
const key = () => randomBytes(32).toString('base64');

console.log(`KEK_V1=${key()}`);
console.log('KEK_CURRENT=v1');
console.log(`BLIND_INDEX_KEY=${key()}`);
console.log(`JWT_SECRET=${randomBytes(48).toString('base64')}`);
console.log(`SEED_STAFF_PASSWORD=${randomBytes(12).toString('base64url')}`);
