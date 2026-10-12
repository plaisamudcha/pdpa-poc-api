import type { Request, Response } from 'express';
import { get as getUser } from '@/services/user/index';

export default async function get(req: Request<{ id: string }>, res: Response) {
  const query = req.query as Record<string, string | undefined>;

  const data = await getUser(req.params.id, req.actor, {
    reveal: query.reveal === 'true',
    reason: query.reason,
  });

  return res.status(data.code).json(data);
}
