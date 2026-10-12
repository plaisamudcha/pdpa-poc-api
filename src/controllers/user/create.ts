import type { Request, Response } from 'express';
import type { ICreateUserDto } from '@/models/dto/user/create';
import { create as createUser } from '@/services/user/index';

export default async function create(req: Request<object, object, ICreateUserDto>, res: Response) {
  const data = await createUser(req.body, req.actor);
  return res.status(data.code).json(data);
}
