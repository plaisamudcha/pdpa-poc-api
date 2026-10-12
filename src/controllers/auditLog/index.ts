import type { Request, Response } from 'express';
import { config } from '@/controllers/main';
import { list as auditLogList } from '@/services/auditLog/index';

async function list(req: Request, res: Response) {
  const query = req.query as Record<string, string | undefined>;

  const data = await auditLogList(
    {
      subjectId: query.subjectId,
      page: Number(query.page ?? config.defaultPage),
      pageSize: Number(query.pageSize ?? config.maxLimit),
    },
    req.actor
  );

  return res.status(data.code).json(data);
}

export default { list };
