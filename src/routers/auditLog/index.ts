import express from 'express';
import { query } from 'express-validator';
import controllers from '@/controllers/auditLog';
import { AUDIT_ACTIONS, AUDIT_CATEGORIES, AUDIT_RESULTS } from '@/externals/mongo/collections/audit-log.collection';
import middleware from '@/middleware';

const routers = express.Router();

routers.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(AUDIT_CATEGORIES),
    query('action').optional().isIn(AUDIT_ACTIONS),
    query('result').optional().isIn(AUDIT_RESULTS),
    query('username').optional().isString().trim().notEmpty().isLength({ max: 64 }),
    query('subjectId').optional().isMongoId(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  middleware.validationHandler,
  controllers.list
);

export default routers;
