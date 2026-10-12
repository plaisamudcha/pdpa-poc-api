import { initMongo } from '@/databases/mongoose';
import UserModel from '@/externals/mongo/collections/user.collection';

type IUserListQuery = {
  page: number;
  pageSize: number;
  desc?: string;
  // เงื่อนไขค้นหาบน searchIdx (blind index) — สร้างจาก services/user/list.ts
  filter?: Record<string, unknown>;
};

export default async function list({ page, pageSize, desc = 'true', filter = {} }: IUserListQuery) {
  await initMongo();

  const query = { ...filter, status: 'active' };
  const sortDirection: 1 | -1 = String(desc).toLowerCase() === 'false' ? 1 : -1;

  const [datas, total] = await Promise.all([
    UserModel.find(query)
      .sort({ createdAt: sortDirection })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    UserModel.countDocuments(query),
  ]);

  return { datas, total, totalPages: Math.ceil(total / pageSize), page, pageSize };
}
