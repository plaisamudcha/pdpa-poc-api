import mongoose from 'mongoose';
import dataKeyRepo from '@/repositories/dataKey';

// วิธี rotate KEK:
// 1. เพิ่ม KEK_V2=<new key> ใน .env และตั้ง KEK_CURRENT=v2 (เก็บ KEK_V1 ไว้ก่อน)
// 2. bun run rotate-kek → re-wrap DEK ทุกตัวด้วย v2 (ข้อมูล user ไม่ต้อง re-encrypt)
// 3. เมื่อไม่มี DEK ไหนใช้ v1 แล้ว จึงลบ KEK_V1 ออก
try {
  const count = await dataKeyRepo.rewrapAll();
  console.log(`re-wrapped ${count} data key(s) to ${Bun.env.KEK_CURRENT}`);
} finally {
  await mongoose.disconnect();
}
