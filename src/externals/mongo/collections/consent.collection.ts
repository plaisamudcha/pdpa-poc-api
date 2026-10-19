import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';

const CONSENT_ACTIONS = ['accept', 'withdraw'] as const;
type ConsentAction = (typeof CONSENT_ACTIONS)[number];

/**
 * ประวัติการยอมรับ / ถอนความยินยอมของเจ้าของข้อมูล (มาตรา 19) — append-only ไม่แก้ไขย้อนหลัง
 * สถานะปัจจุบัน = record ล่าสุดของ user เทียบกับเวอร์ชันล่าสุดของเอกสาร
 * ไม่มี PII — เก็บแค่ userId จึงเก็บไว้เป็นหลักฐานได้แม้ user ถูกลบ (crypto-shredding) แล้ว
 */
const consentSchema = new Schema(
  {
    userId: { type: String, required: true },
    action: { type: String, enum: CONSENT_ACTIONS, required: true },
    documentId: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, required: true },
    reason: { type: String, default: null },
    // staff ที่บันทึกแทนเจ้าของข้อมูล
    recordedBy: {
      id: { type: String, required: true },
      role: { type: String, required: true },
    },
  },
  {
    collection: 'consents',
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

consentSchema.index({ userId: 1, createdAt: -1 });

applyIdTransform(consentSchema);

type TypeConsent = Omit<InferSchemaType<typeof consentSchema>, 'recordedBy'> & {
  _id: mongoose.Types.ObjectId;
  recordedBy: { id: string; role: string };
  createdAt: Date;
};

const ConsentModel: Model<TypeConsent> = mongoose.models.Consent || mongoose.model<TypeConsent>('Consent', consentSchema);

export { CONSENT_ACTIONS };
export type { TypeConsent, ConsentAction };
export default ConsentModel;
