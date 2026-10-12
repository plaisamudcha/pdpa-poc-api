import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';
import applyIdTransform from '@/externals/mongo/schema/applyIdTransform';

const piiSchema = new Schema(
  {
    // ทุก field เก็บเป็น ciphertext "v1.<base64>" — ห้ามเก็บ plaintext
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    citizenId: { type: String },
    phone: { type: String },
    address: { type: String },
    healthNote: { type: String }, // ข้อมูลอ่อนไหว (มาตรา 26)
  },
  { _id: false }
);

/**
 * Blind index (HMAC) สำหรับค้นหา — ไม่มี plaintext
 *  - ค่าเดี่ยว (email, citizenId): ค้นแบบตรงตัว + unique กันข้อมูลซ้ำ
 *  - array (*Prefix): ค้นด้วย 3–5 ตัวแรก (multikey index, ไม่ unique)
 *  - *Last4: ค้นด้วย 4 ตัวท้าย (ไม่ unique)
 * ที่อยู่และข้อมูลสุขภาพไม่ทำ index โดยตั้งใจ
 */
const searchIdxSchema = new Schema(
  {
    email: { type: String },
    emailPrefix: { type: [String], default: undefined },
    citizenId: { type: String },
    citizenIdLast4: { type: String },
    phoneLast4: { type: String },
    firstNamePrefix: { type: [String], default: undefined },
    lastNamePrefix: { type: [String], default: undefined },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    pii: { type: piiSchema, default: {} },
    searchIdx: { type: searchIdxSchema, default: {} },
    status: { type: String, enum: ['active', 'erased'], default: 'active', index: true },
    // ครบกำหนดแล้ว job จะลบอัตโนมัติ (crypto-shredding)
    retentionUntil: { type: Date, required: true },
    erasedAt: { type: Date, default: null },
  },
  {
    collection: 'users',
    versionKey: false,
    timestamps: true,
  }
);

userSchema.index({ 'searchIdx.email': 1 }, { unique: true, partialFilterExpression: { 'searchIdx.email': { $exists: true } } });
userSchema.index({ 'searchIdx.citizenId': 1 }, { unique: true, partialFilterExpression: { 'searchIdx.citizenId': { $exists: true } } });
userSchema.index({ 'searchIdx.emailPrefix': 1 });
userSchema.index({ 'searchIdx.citizenIdLast4': 1 });
userSchema.index({ 'searchIdx.phoneLast4': 1 });
userSchema.index({ 'searchIdx.firstNamePrefix': 1 });
userSchema.index({ 'searchIdx.lastNamePrefix': 1 });
userSchema.index({ status: 1, retentionUntil: 1 });

applyIdTransform(userSchema);

type TypeUser = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
type TypeSearchIdx = InferSchemaType<typeof searchIdxSchema>;

const UserModel: Model<TypeUser> = mongoose.models.User || mongoose.model<TypeUser>('User', userSchema);

export type { TypeUser, TypeSearchIdx };
export default UserModel;
