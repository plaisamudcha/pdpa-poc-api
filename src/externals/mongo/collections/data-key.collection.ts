import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';

/**
 * Envelope encryption: 1 user = 1 DEK
 *  - DEK ถูก wrap ด้วย KEK แล้วเก็บที่นี่ (แยกจาก collection users)
 *  - ลบ DEK = ข้อมูลของ user นั้นอ่านไม่ได้อีกเลย รวมถึงใน backup (crypto-shredding)
 *
 * Production: แยก collection นี้ไปอยู่ DB/cluster อื่น จำกัดสิทธิ์ และตั้ง backup retention ให้สั้นกว่า users
 */
const dataKeySchema = new Schema(
  {
    _id: { type: String }, // = userId
    wrappedDek: { type: String, required: true }, // base64(iv|tag|ciphertext)
    kekVersion: { type: String, required: true, index: true },
    rotatedAt: { type: Date, default: null },
  },
  {
    collection: 'data_keys',
    versionKey: false,
    timestamps: true,
  }
);

type TypeDataKey = InferSchemaType<typeof dataKeySchema> & { _id: string };

const DataKeyModel: Model<TypeDataKey> = mongoose.models.DataKey || mongoose.model<TypeDataKey>('DataKey', dataKeySchema);

export type { TypeDataKey };
export default DataKeyModel;
