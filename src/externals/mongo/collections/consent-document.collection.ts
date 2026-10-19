import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';

/**
 * เอกสาร PDPA (privacy notice / หนังสือขอความยินยอม) แต่ละเวอร์ชัน — ไฟล์ PDF อยู่ใน GridFS bucket "consent_files"
 * อัปโหลดใหม่ = เวอร์ชันถัดไปเสมอ (ไม่แก้ไขหรือลบเวอร์ชันเก่า เพราะเป็นหลักฐานว่าเจ้าของข้อมูลยอมรับข้อความใด)
 */
const consentDocumentSchema = new Schema(
  {
    version: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    note: { type: String, default: null },
    fileId: { type: Schema.Types.ObjectId, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    // ใช้ยืนยันว่าไฟล์ไม่ถูกแก้ไขหลังอัปโหลด
    sha256: { type: String, required: true },
    uploadedBy: {
      id: { type: String, required: true },
      role: { type: String, required: true },
    },
  },
  {
    collection: 'consent_documents',
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// unique กันอัปโหลดพร้อมกันแล้วได้เลขเวอร์ชันซ้ำ
consentDocumentSchema.index({ version: -1 }, { unique: true });

applyIdTransform(consentDocumentSchema);

type TypeConsentDocument = Omit<InferSchemaType<typeof consentDocumentSchema>, 'uploadedBy'> & {
  _id: mongoose.Types.ObjectId;
  uploadedBy: { id: string; role: string };
  createdAt: Date;
};

const ConsentDocumentModel: Model<TypeConsentDocument> =
  mongoose.models.ConsentDocument || mongoose.model<TypeConsentDocument>('ConsentDocument', consentDocumentSchema);

export type { TypeConsentDocument };
export default ConsentDocumentModel;
