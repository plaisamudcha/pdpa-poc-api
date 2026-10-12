import mongoose, { Schema, type Model } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';
import type { Actor } from '@/models/business/actor';

type AuditAction = 'create' | 'list' | 'read' | 'update' | 'export' | 'erase' | 'search' | 'login' | 'logout';

/** Audit log — ห้ามมี PII plaintext อยู่ใน log */
interface TypeAuditLog {
  actor: Actor;
  action: AuditAction;
  subjectId?: string | null;
  fields?: string[]; // field ที่ถูก decrypt แบบเต็ม (ไม่ mask)
  reason?: string | null;
  result: 'ok' | 'denied' | 'not_found';
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

applyIdTransform(auditLogSchema);

const AuditLogModel: Model<TypeAuditLog> = mongoose.models.AuditLog || mongoose.model<TypeAuditLog>('AuditLog', auditLogSchema);

export type { TypeAuditLog, AuditAction };
export default AuditLogModel;
