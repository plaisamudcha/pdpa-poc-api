import { ROLE_POLICY } from '@/constant/pdpa';
import { errRes, successRes } from '@/controllers/main';
import type { Actor } from '@/models/business/actor';
import type { IAuditLogListDto } from '@/models/dto/auditLog';
import auditLogRepo from '@/repositories/auditLog';
import staffRepo from '@/repositories/staff';

const EMPTY = (page: number, pageSize: number) => ({ datas: [], total: 0, totalPages: 0, page, pageSize });

export default async function list({ username, from, to, ...query }: IAuditLogListDto, actor: Actor) {
  if (!ROLE_POLICY[actor.role].audit) {
    return errRes.ACCESS_DENIED({ message: 'Forbidden' });
  }

  try {
    // log เก็บแค่ actor.id — กรองด้วย username ต้องแปลงเป็น id ก่อน
    let actorId: string | undefined;
    if (username) {
      const staff = await staffRepo.findByUsername(username);
      if (!staff) return successRes(EMPTY(query.page, query.pageSize));
      actorId = String(staff._id);
    }

    const result = await auditLogRepo.list({
      ...query,
      actorId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    // เติมชื่อพนักงานตอนแสดงผล (ไม่เก็บชื่อซ้ำใน log — เปลี่ยนชื่อแล้วยังโยงกลับได้จาก id)
    const staffs = await staffRepo.findByIds(result.datas.map((log) => log.actor.id));
    const staffById = new Map(staffs.map((s) => [String(s._id), s]));

    return successRes({
      ...result,
      datas: result.datas.map((log) => {
        const staff = staffById.get(log.actor.id);
        return {
          ...log,
          actor: {
            ...log.actor,
            username: staff?.username ?? null,
            displayName: staff?.displayName ?? null,
            isActive: staff?.isActive ?? null,
          },
        };
      }),
    });
  } catch (error) {
    console.error('Audit log list error:', error);
    return errRes.INTERNAL_SERVER_ERROR({ message: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}
