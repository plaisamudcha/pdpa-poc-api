import { Types } from 'mongoose';
import { initMongo } from '@/databases/mongoose';
import ConsentDocumentModel, { type TypeConsentDocument } from '@/externals/mongo/collections/consent-document.collection';
import { consentFileBucket } from '@/externals/mongo/gridfs';

type CreateConsentDocument = Omit<TypeConsentDocument, '_id' | 'createdAt'>;

async function create(data: CreateConsentDocument) {
  await initMongo();

  return ConsentDocumentModel.create(data);
}

async function list() {
  await initMongo();

  return ConsentDocumentModel.find().sort({ version: -1 }).lean();
}

/** เวอร์ชันล่าสุด = เวอร์ชันที่ใช้อยู่ปัจจุบัน */
async function getLatest() {
  await initMongo();

  return ConsentDocumentModel.findOne().sort({ version: -1 }).lean();
}

async function getByVersion(version: number) {
  await initMongo();

  return ConsentDocumentModel.findOne({ version }).lean();
}

async function uploadFile(fileName: string, buffer: Buffer, metadata: Record<string, unknown>): Promise<Types.ObjectId> {
  const bucket = await consentFileBucket();
  const stream = bucket.openUploadStream(fileName, { metadata: { contentType: 'application/pdf', ...metadata } });

  await new Promise<void>((resolve, reject) => {
    stream.once('finish', () => resolve());
    stream.once('error', reject);
    stream.end(buffer);
  });

  return stream.id;
}

async function openFile(fileId: Types.ObjectId) {
  const bucket = await consentFileBucket();

  return bucket.openDownloadStream(fileId);
}

async function deleteFile(fileId: Types.ObjectId) {
  const bucket = await consentFileBucket();

  return bucket.delete(fileId);
}

export default {
  create,
  list,
  getLatest,
  getByVersion,
  uploadFile,
  openFile,
  deleteFile,
};
