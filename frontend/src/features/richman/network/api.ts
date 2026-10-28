import { ApiError, request } from '../../../api/client';
import { loadSession } from '../../../auth/storage';
export async function netRequest<T>(owner: string, path: string, body?: unknown, controllerId?: string, signal?: AbortSignal): Promise<T> {
  const session = loadSession();
  if (!session || session.user.id !== owner) throw new ApiError('ACCESS_TOKEN_INVALID', '请使用原账号重新登录后继续', 401);
  return request<T>(`/richman${path}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${session.tokens.accessToken}`, ...(controllerId ? { 'X-Richman-Controller': controllerId } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
}
