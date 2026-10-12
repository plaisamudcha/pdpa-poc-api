import jwt from 'jsonwebtoken';
import config from '@/config';
import type { TokenPayload } from '@/models/business/auth';

function sign({ sub, ver }: TokenPayload): string {
  return jwt.sign({ ver }, config.auth.JWT_SECRET, {
    algorithm: 'HS256',
    subject: sub,
    expiresIn: `${config.auth.JWT_EXPIRES_IN_HOURS}h`,
  });
}

/** คืน payload ถ้า token ถูกต้องและยังไม่หมดอายุ ไม่งั้นคืน null */
function verify(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.auth.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string' || typeof payload.ver !== 'number') return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}

export default { sign, verify };
