import type { User } from '@prisma/client';

/** 对外暴露的用户字段，绝不返回密码哈希等敏感信息 */
export const toUserView = (u: User) => ({
  id: u.id,
  username: u.username,
  nickname: u.nickname,
  role: u.role,
  createdAt: u.createdAt,
});
