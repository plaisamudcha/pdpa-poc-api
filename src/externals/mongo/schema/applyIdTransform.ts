import type { Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

function applyIdTransform(schema: Schema): void {
  schema.virtual('id').get(function (this: any) {
    return this._id?.toString();
  });

  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
    },
  });

  schema.set('toObject', {
    virtuals: true,
  });

  schema.plugin(mongooseLeanVirtuals);
}

export default applyIdTransform;
