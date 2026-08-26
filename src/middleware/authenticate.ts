import type { RequestHandler } from 'express';
import type { AppContext } from '../app-context';
import { AppError } from '../lib/app-error';
import { verifyAccessToken } from '../modules/auth/tokens';

export function authenticate(context: AppContext): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header('authorization');
      if (!authorization?.startsWith('Bearer ')) {
        throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
      }

      const claims = verifyAccessToken(context.config, authorization.slice(7));
      const user = await context.models.User.findByPk(claims.sub);
      if (!user || user.status !== 'active' || user.authVersion !== claims.av) {
        throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
      }

      request.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
