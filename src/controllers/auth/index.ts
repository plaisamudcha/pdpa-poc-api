import type { Request, Response } from 'express';
import config from '@/config';
import { successRes } from '@/controllers/main';
import type { ILoginDto } from '@/models/dto/auth';
import staffRepo from '@/repositories/staff';
import { login as loginService } from '@/services/auth/index';
import { authCookieOptions, postAuditLog } from '@/utility';

async function login(req: Request<object, object, ILoginDto>, res: Response) {
  const result = await loginService(req.body);

  if (result.code !== 200 || !result.payload) {
    return res.status(result.code).json(result);
  }

  // token อยู่ใน httpOnly cookie เท่านั้น — ไม่ส่งใน body ให้ JavaScript เห็น
  res.cookie(config.auth.COOKIE_NAME, result.payload.token, authCookieOptions());
  return res.status(200).json(successRes(result.payload.profile));
}

async function logout(req: Request, res: Response) {
  const { maxAge, ...options } = authCookieOptions();
  res.clearCookie(config.auth.COOKIE_NAME, options);
  // JWT ไม่มีสถานะที่ server — ต้องเพิกถอนเอง ไม่งั้น token ที่ถูกขโมยไปยังใช้ได้จนหมดอายุ
  await staffRepo.recordLogin.revokeSessions(req.actor.id);
  await postAuditLog({ actor: req.actor, action: 'logout', result: 'ok' });
  return res.status(200).json(successRes({ message: 'Logged out' }));
}

async function me(req: Request, res: Response) {
  return res.status(200).json(successRes(req.staff));
}

export default { login, logout, me };
