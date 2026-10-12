import express from 'express';
import { query } from 'express-validator';
import controllers from '@/controllers/auditLog';
import middleware from '@/middleware';

const routers = express.Router();

routers.get(
  '/',
  [query('subjectId').optional().isMongoId(), query('page').optional().isInt({ min: 1 }), query('pageSize').optional().isInt({ min: 1, max: 100 })],
  middleware.validationHandler,
  controllers.list
);

export default routers;
