import { Router } from 'express';
import type { AppContext } from '../../app-context';
import { AppError } from '../../lib/app-error';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimit, refreshRateLimit } from '../../middleware/rate-limit';
import { changePassword, login, logout, logoutAll, refresh, register } from './auth-service';
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema } from './validation';

function clientMetadata(request: { ip: string | undefined; get: (name: string) => string | undefined }) {
  return {
    ip: request.ip ?? null,
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
  };
}

export function createAuthRouter(context: AppContext) {
  const router = Router();

  router.post('/register', authRateLimit, asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    return sendSuccess(response, await register(context, input, clientMetadata(request)), 201);
  }));

  router.post('/login', authRateLimit, asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    return sendSuccess(response, await login(context, input, clientMetadata(request)));
  }));

  router.post('/refresh', refreshRateLimit, asyncHandler(async (request, response) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    return sendSuccess(response, await refresh(context, refreshToken, clientMetadata(request)));
  }));

  router.post('/logout', asyncHandler(async (request, response) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    await logout(context, refreshToken);
    return sendSuccess(response, null);
  }));

  router.post('/logout-all', authenticate(context), asyncHandler(async (request, response) => {
    if (!request.authUser) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
    await logoutAll(context, request.authUser.id);
    return sendSuccess(response, null);
  }));

  router.put('/password', authenticate(context), asyncHandler(async (request, response) => {
    if (!request.authUser) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
    const input = changePasswordSchema.parse(request.body);
    await changePassword(context, request.authUser.id, input);
    return sendSuccess(response, null);
  }));

  return router;
}
