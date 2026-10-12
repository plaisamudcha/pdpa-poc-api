import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';
import { STAFF_ROLES } from '@/constant/pdpa';

/** บัญชีพนักงานที่ login เข้าระบบหลังบ้าน (ไม่ใช่ user ที่เป็นเจ้าของข้อมูล) */
const staffSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    // Argon2id (Bun.password) — ห้ามเก็บรหัสผ่าน plaintext
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: STAFF_ROLES, required: true },
    isActive: { type: Boolean, default: true },
    // กันเดารหัสผ่าน: ผิดเกิน MAX_FAILED_LOGIN ครั้ง → ล็อกถึง lockedUntil
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    // ฝังใน JWT — logout / รีเซ็ตรหัสผ่าน จะเพิ่มค่านี้ ทำให้ token เก่าทุกตัวใช้ไม่ได้ทันที
    sessionVersion: { type: Number, default: 0 },
  },
  {
    collection: 'staffs',
    versionKey: false,
    timestamps: true,
  }
);

staffSchema.index({ username: 1 }, { unique: true });

applyIdTransform(staffSchema);

type TypeStaff = InferSchemaType<typeof staffSchema> & { _id: mongoose.Types.ObjectId };

const StaffModel: Model<TypeStaff> = mongoose.models.Staff || mongoose.model<TypeStaff>('Staff', staffSchema);

export type { TypeStaff };
export default StaffModel;
