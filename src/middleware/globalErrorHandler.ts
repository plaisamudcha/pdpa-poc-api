import type { NextFunction, Request, Response } from 'express';
import { errRes } from '@/controllers/main';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function globalErrorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  // body ใหญ่เกิน limit ของ express.json / express.raw (เช่น ไฟล์ PDF เกินขนาด)
  if ((error as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ ...errRes.BAD_REQUEST({ message: 'ไฟล์หรือข้อมูลมีขนาดใหญ่เกินกำหนด' }), code: 413 });
    return;
  }

  console.error('Unhandled error:', error.name, error.message);
  res.status(500).json(errRes.INTERNAL_SERVER_ERROR({ message: 'Internal Server Error' }));
}

export default globalErrorHandler;
