import type { AuthPayload, User } from '../auth/types';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', '无法连接服务器，请检查网络后重试', 0);
  }

  const body = await response.json().catch(() => null) as ApiSuccess<T> | ApiFailure | null;
  if (!response.ok || !body || body.success === false) {
    const error = body && body.success === false ? body.error : null;
    throw new ApiError(error?.code ?? 'REQUEST_FAILED', error?.message ?? '请求失败，请稍后重试', response.status, error?.details);
  }
  return body.data;
}

export function login(input: { username: string; password: string }) {
  return request<AuthPayload>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function register(input: { username: string; displayName: string; password: string; inviteCode: string }) {
  return request<AuthPayload>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function refresh(refreshToken: string) {
  return request<AuthPayload>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export function logout(refreshToken: string) {
  return request<null>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export async function getCurrentUser(accessToken: string) {
  const data = await request<{ user: User }>('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.user;
}

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: '请检查填写内容后重试',
  INVITE_REQUIRED: '请输入邀请码',
  INVITE_INVALID: '邀请码无效或邀请人账号不可用',
  USERNAME_TAKEN: '这个用户名已被使用',
  INVALID_CREDENTIALS: '用户名或密码错误',
  ACCOUNT_DISABLED: '账号已被禁用，请联系管理员',
  RATE_LIMITED: '尝试次数过多，请稍后再试',
  ACCESS_TOKEN_INVALID: '登录状态已失效，请重新登录',
  REFRESH_TOKEN_INVALID: '登录状态已失效，请重新登录',
  NETWORK_ERROR: '无法连接服务器，请检查网络后重试',
};

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return errorMessages[error.code] ?? error.message;
  return '发生未知错误，请稍后重试';
}
