import express from 'express';
import { param, query } from 'express-validator';
import { MAX_CONSENT_FILE_MB } from '@/constant/pdpa';
import controllers from '@/controllers/consent';
import middleware from '@/middleware';

const routers = express.Router();

routers.get('/', controllers.listDocument);
routers.get('/latest', controllers.latestDocument);
routers.post(
  '/',
  // รับไฟล์ PDF เป็น body ตรงๆ เฉพาะ route นี้ (route อื่นจำกัด JSON ที่ 100kb)
  express.raw({ type: 'application/pdf', limit: `${MAX_CONSENT_FILE_MB}mb` }),
  [
    query('title').isString().trim().notEmpty().isLength({ max: 200 }),
    query('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }),
    query('fileName').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }),
  ],
  middleware.validationHandler,
  controllers.uploadDocument
);
routers.get('/:version/file', [param('version').isInt({ min: 1 })], middleware.validationHandler, controllers.documentFile);

export default routers;
