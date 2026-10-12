import type { Request, Response } from 'express';
import { remove as removeUser } from '@/services/user/index';

export default async function remove(req: Request<{ id: string }, object, { reason: string }>, res: Response) {
  const data = await removeUser(req.params.id, req.actor, req.body.reason);
  return res.status(data.code).json(data);
}
