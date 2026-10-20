import type { AuditAction, AuditCategory, AuditResult } from '@/externals/mongo/collections/audit-log.collection';

/** ตัวกรองหน้า audit log — username ถูกแปลงเป็น actorId ที่ service */
interface IAuditLogListDto {
  page: number;
  pageSize: number;
  category?: AuditCategory;
  action?: AuditAction;
  result?: AuditResult;
  username?: string;
  subjectId?: string;
  from?: string;
  to?: string;
}

export type { IAuditLogListDto };
