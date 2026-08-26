import { z } from 'zod';

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,32}$/, '用户名必须为 3-32 位小写字母、数字或下划线');

const password = z.string().min(10, '密码至少 10 位').max(128, '密码最多 128 位');
const displayName = z.string().trim().min(1, '显示名不能为空').max(64, '显示名最多 64 位');
const inviteCode = z
  .string({ error: '邀请码不能为空' })
  .trim()
  .toUpperCase()
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/, '邀请码格式错误');

export const registerSchema = z.object({ username, password, displayName, inviteCode });
export const loginSchema = z.object({ username, password: z.string().min(1) });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const changePasswordSchema = z.object({ oldPassword: z.string().min(1), newPassword: password });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
