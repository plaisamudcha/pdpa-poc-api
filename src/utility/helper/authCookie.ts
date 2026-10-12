import type { CookieOptions } from 'express';
import config from '@/config';

/**
 * cookie เก็บ JWT — httpOnly (JavaScript อ่านไม่ได้ กัน token หลุดจาก XSS)
 * HTTP (dev) → Secure=false, SameSite=lax / HTTPS → Secure=true, SameSite=none
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.server.COOKIE_SECURE,
    sameSite: config.server.COOKIE_SECURE ? 'none' : 'lax',
    maxAge: config.auth.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000,
    path: '/',
  };
}
