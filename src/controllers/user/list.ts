import type { Request, Response } from 'express';
import { config } from '@/controllers/main';
import { list as userList } from '@/services/user/index';

export default async function list(req: Request, res: Response) {
  const query = req.query as Record<string, string | undefined>;

  const data = await userList(
    {
      search: query.search,
      desc: query.desc,
      page: Number(query.page ?? config.defaultPage),
      pageSize: Number(query.pageSize ?? config.maxLimit),
    },
    req.actor
  );

  return res.status(data.code).json(data);
}
