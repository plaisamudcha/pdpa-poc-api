import type { Request, Response } from 'express';
import { exportData as exportUser } from '@/services/user/index';

export default async function exportData(req: Request<{ id: string }>, res: Response) {
  const data = await exportUser(req.params.id, req.actor);
  return res.status(data.code).json(data);
}
