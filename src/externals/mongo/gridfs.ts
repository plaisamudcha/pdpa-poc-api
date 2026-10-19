import mongoose from 'mongoose';
import { initMongo } from '@/databases/mongoose';

/** GridFS bucket เก็บไฟล์ PDF ของเอกสาร PDPA (consent_files.files / consent_files.chunks) */
export async function consentFileBucket() {
  await initMongo();

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'consent_files' });
}
