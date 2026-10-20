import mongoose, { Schema, type Model } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';
import type { Actor } from '@/models/business/actor';

const AUDIT_ACTIONS = [
  'create',
  'list',
  'search',
  'read',
  'update',
  'export',
  'erase',
  'login',
  'logout',
  'consent',
  'withdraw_consent',
  'upload_document',
] as const;
const AUDIT_RESULTS = ['ok', 'denied', 'not_found'] as const;

type AuditAction = (typeof AUDIT_ACTIONS)[number];
type AuditResult = (typeof AUDIT_RESULTS)[number];

/** หมวดของ log — auth = ประวัติการเข้าสู่ระบบ, data = การเข้าถึงข้อมูลส่วนบุคคล (ทุก action ที่ไม่ใช่ auth) */
const AUDIT_CATEGORIES = ['auth', 'data'] as const;
const AUTH_ACTIONS: readonly AuditAction[] = ['login', 'logout'];
type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Audit log — ห้ามมี PII plaintext อยู่ใน log */
interface TypeAuditLog {
  actor: Actor;
  action: AuditAction;
  subjectId?: string | null;
  fields?: string[]; // field ที่ถูก decrypt แบบเต็ม (ไม่ mask)
  reason?: string | null;
  result: AuditResult;
  createdAt?: Date;
}

const auditLogSchema = new Schema<TypeAuditLog>(
  {
    actor: {
      id: { type: String, required: true },
      role: { type: String, required: true },
    },
    action: { type: String, required: true },
    subjectId: { type: String, default: null, index: true },
    fields: { type: [String], default: [] },
    reason: { type: String, default: null },
    result: { type: String, required: true },
  },
  {
    collection: 'audit_logs',
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

applyIdTransform(auditLogSchema);

const AuditLogModel: Model<TypeAuditLog> = mongoose.models.AuditLog || mongoose.model<TypeAuditLog>('AuditLog', auditLogSchema);

export { AUDIT_ACTIONS, AUDIT_RESULTS, AUDIT_CATEGORIES, AUTH_ACTIONS };
export type { TypeAuditLog, AuditAction, AuditResult, AuditCategory };
export default AuditLogModel;
