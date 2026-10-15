import type { Request, Response } from 'express';
import { config } from '@/controllers/main';
import type { IAuditLogListDto } from '@/models/dto/auditLog';
import { list as auditLogList } from '@/services/auditLog/index';

async function list(req: Request, res: Response) {
  const query = req.query as Record<string, string | undefined>;

  const data = await auditLogList(
    {
      page: Number(query.page ?? config.defaultPage),
      pageSize: Number(query.pageSize ?? config.maxLimit),
      action: query.action as IAuditLogListDto['action'],
      result: query.result as IAuditLogListDto['result'],
      username: query.username,
      subjectId: query.subjectId,
      from: query.from,
      to: query.to,
    },
    req.actor
  );

  return res.status(data.code).json(data);
}

export default { list };
