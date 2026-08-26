import { Router } from 'express';
import type { AppContext } from '../../app-context';
import { AppError } from '../../lib/app-error';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { presentUser } from './user-presenter';

export function createUserRouter(context: AppContext) {
  const router = Router();
  router.get('/me', authenticate(context), asyncHandler(async (request, response) => {
    if (!request.authUser) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
    return sendSuccess(response, { user: presentUser(request.authUser) });
  }));
  return router;
}
