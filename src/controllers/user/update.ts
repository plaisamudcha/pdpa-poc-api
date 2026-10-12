import type { Request, Response } from 'express';
import type { IUpdateUserDto } from '@/models/dto/user/update';
import { update as updateUser } from '@/services/user/index';

export default async function update(req: Request<{ id: string }, object, IUpdateUserDto>, res: Response) {
  const data = await updateUser(req.params.id, req.body, req.actor);
  return res.status(data.code).json(data);
}
