import { ROLE_POLICY } from '@/constant/pdpa';
import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import auditLogRepo from '@/repositories/auditLog';

export default async function list(query: { subjectId?: string; page: number; pageSize: number }, actor: Actor) {
  if (!ROLE_POLICY[actor.role].audit) {
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  try {
    return successRes(await auditLogRepo.list(query));
  } catch (error) {
    console.error('Audit log list error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
