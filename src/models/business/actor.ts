/**
 * support / admin / dpo = พนักงานที่ login
 * system   = job ภายใน (เช่น ลบข้อมูลเมื่อครบระยะเวลาเก็บ)
 * anonymous = ยังไม่ได้ login (ใช้ใน audit log ของการ login ไม่สำเร็จ)
 */
export type Role = 'support' | 'admin' | 'dpo' | 'system' | 'anonymous';

export type StaffRole = 'support' | 'admin' | 'dpo';

export interface Actor {
  id: string;
  role: Role;
}
