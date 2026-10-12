import { purgeExpired } from '@/services/user/index';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function run() {
  try {
    const count = await purgeExpired();
    if (count > 0) console.log(`\x1b[32minfo\x1b[0m retention job erased ${count} user(s)`);
  } catch (error) {
    console.error('Retention job error:', error);
  }
}

/** ลบข้อมูลที่เกินระยะเวลาเก็บ วันละครั้ง (และครั้งแรกตอนเริ่ม server) */
export default function startRetentionJob() {
  run();
  setInterval(run, ONE_DAY_MS);
}
