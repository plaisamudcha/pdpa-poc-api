import { pipeline } from 'node:stream/promises';
import type { Request, Response } from 'express';
import { errRes } from '@/controllers/main';
import type { ConsentAction } from '@/externals/mongo/collections/consent.collection';
import {
  getDocumentFile,
  getLatestDocument,
  getUserConsent,
  listDocuments,
  recordUserConsent,
  uploadDocument as uploadConsentDocument,
} from '@/services/consent/index';

async function listDocument(req: Request, res: Response) {
  const data = await listDocuments();
  return res.status(data.code).json(data);
}

async function latestDocument(req: Request, res: Response) {
  const data = await getLatestDocument();
  return res.status(data.code).json(data);
}

/** body เป็นไฟล์ PDF ตรงๆ (Content-Type: application/pdf) — ข้อมูลประกอบส่งทาง query */
async function uploadDocument(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json(errRes.BAD_REQUEST({ message: 'กรุณาแนบไฟล์ PDF (Content-Type: application/pdf)' }));
  }

  const query = req.query as Record<string, string | undefined>;
  const data = await uploadConsentDocument(
    { title: query.title!.trim(), note: query.note?.trim(), fileName: query.fileName?.trim(), buffer: req.body },
    req.actor
  );
  return res.status(data.code).json(data);
}

async function documentFile(req: Request<{ version: string }>, res: Response) {
  const result = await getDocumentFile(Number(req.params.version));
  if (!result) return res.status(404).json(errRes.DATA_NOT_FOUND({ message: 'ไม่พบเอกสาร' }));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(result.doc.fileSize));
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(result.doc.fileName)}`);
  // ไฟล์ของแต่ละเวอร์ชันไม่เปลี่ยนแล้ว
  res.setHeader('Cache-Control', 'private, max-age=86400, immutable');

  try {
    await pipeline(result.stream, res);
  } catch (error) {
    console.error('Consent document file error:', error);
    if (!res.headersSent) res.status(500).json(errRes.INTERNAL_SERVER_ERROR({ message: 'อ่านไฟล์ไม่สำเร็จ' }));
    else res.destroy();
  }
}

async function getUser(req: Request<{ id: string }>, res: Response) {
  const data = await getUserConsent(req.params.id);
  return res.status(data.code).json(data);
}

async function recordUser(req: Request<{ id: string }, object, { action: ConsentAction; version?: number; reason?: string }>, res: Response) {
  const data = await recordUserConsent(req.params.id, req.body, req.actor);
  return res.status(data.code).json(data);
}

export default { listDocument, latestDocument, uploadDocument, documentFile, getUser, recordUser };
