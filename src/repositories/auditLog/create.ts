import { initMongo } from '@/databases/mongoose';
import AuditLogModel, { type TypeAuditLog } from '@/externals/mongo/collections/audit-log.collection';

export default async function create(data: TypeAuditLog) {
  await initMongo();

  return AuditLogModel.create(data);
}
