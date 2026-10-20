import { initMongo } from '@/databases/mongoose';
import AuditLogModel, { AUTH_ACTIONS, type AuditAction, type AuditCategory, type AuditResult } from '@/externals/mongo/collections/audit-log.collection';

type IAuditLogFilter = {
  page: number;
  pageSize: number;
  category?: AuditCategory;
  action?: AuditAction;
  result?: AuditResult;
  actorId?: string;
  subjectId?: string;
  from?: Date;
  to?: Date;
};

export default async function list({ page, pageSize, category, action, result, actorId, subjectId, from, to }: IAuditLogFilter) {
  await initMongo();

  const query: Record<string, unknown> = {};
  if (category) query.action = { [category === 'auth' ? '$in' : '$nin']: AUTH_ACTIONS };
  // action ที่ระบุต้องอยู่ในหมวดเดียวกัน ไม่งั้นได้ผลว่าง
  if (action) query.action = !category || AUTH_ACTIONS.includes(action) === (category === 'auth') ? action : { $in: [] };
  if (result) query.result = result;
  if (actorId) query['actor.id'] = actorId;
  if (subjectId) query.subjectId = subjectId;
  if (from || to) query.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const [datas, total] = await Promise.all([
    AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean({ virtuals: true }),
    AuditLogModel.countDocuments(query),
  ]);

  return { datas, total, totalPages: Math.ceil(total / pageSize), page, pageSize };
}
