import mongoose from 'mongoose';
import config from '@/config';
import { describeMongoUrl } from '@/databases/mongo';
import type { StaffRole } from '@/models/business/actor';
import staffRepo from '@/repositories/staff';

// สร้าง/รีเซ็ตบัญชีพนักงาน 3 role สำหรับ POC
// รหัสผ่านทุกบัญชีอ่านจาก SEED_STAFF_PASSWORD ใน .env (สร้างด้วย bun run gen-keys)
// bun run seed-staff
const STAFFS: { username: string; displayName: string; role: StaffRole }[] = [
  { username: 'support01', displayName: 'Support (POC)', role: 'support' },
  { username: 'admin01', displayName: 'Admin (POC)', role: 'admin' },
  { username: 'dpo01', displayName: 'DPO (POC)', role: 'dpo' },
];

const password = Bun.env.SEED_STAFF_PASSWORD;
if (!password || password.length < 12) {
  console.error('SEED_STAFF_PASSWORD must be set in .env (at least 12 characters) — run: bun run gen-keys');
  process.exit(1);
}

try {
  console.log(`seeding staff accounts into ${describeMongoUrl(config.database.DATABASE_URL)}`);
  const passwordHash = await Bun.password.hash(password);

  for (const staff of STAFFS) {
    await staffRepo.upsert({ ...staff, passwordHash });
    console.log(`  ${staff.role.padEnd(8)} ${staff.username}`);
  }
  console.log('password: SEED_STAFF_PASSWORD in .env');
} finally {
  await mongoose.disconnect();
}
