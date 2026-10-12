import { initMongo } from '@/databases/mongoose';
import AuditLogModel from '@/externals/mongo/collections/audit-log.collection';

export default async function list({ subjectId, page, pageSize }: { subjectId?: string; page: number; pageSize: number }) {
  await initMongo();

  const query = subjectId ? { subjectId } : {};

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
