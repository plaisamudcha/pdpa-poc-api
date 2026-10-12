import type { PiiField } from '@/constant/pdpa';

/** แสดงผลแบบ mask เป็นค่าเริ่มต้น (data minimization ตอนแสดงผล) */
export default function mask(field: PiiField, v: string): string {
  switch (field) {
    case 'email': {
      const [local = '', domain = ''] = v.split('@');
      return `${local.slice(0, 1)}***@${domain}`;
    }
    case 'citizenId': {
      const d = v.replace(/\D/g, '');
      return d.length === 13 ? `${d[0]}-XXXX-XXXXX-${d.slice(10, 12)}-${d[12]}` : 'XXXXXXXXXXXXX';
    }
    case 'phone': {
      const d = v.replace(/\D/g, '');
      return `XXX-XXX-${d.slice(-4)}`;
    }
    case 'firstName':
    case 'lastName':
      return `${Array.from(v)[0] ?? ''}***`;
    default:
      return '***';
  }
}
