import { json, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AppContext } from '../../app-context';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { AppError } from '../../lib/app-error';
import type { Intent } from '../../../shared/richman/host';
import { validCommand } from '../../../shared/richman/game/save-validation';
const gameId = z.string().uuid();
const intent = z.strictObject({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  expectedRevision: z.number().int().min(0).max(4_294_967_294), action: z.unknown() })
  .refine(v => validCommand({ ...v, gameId: 'schema', playerId: 'player-1' }), '命令格式无效');
export function createGameRouter(context: AppContext) {
  const router = Router();
  router.use(authenticate(context));
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.use(rateLimit({ windowMs: 60_000, limit: 1800, keyGenerator: request => request.authUser!.id,
    standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({ success: false, error: { code: 'NET_RATE_LIMITED', message: '对局请求过于频繁' } }),
  }));
  router.use(json({ limit: '4kb', inflate: false }));
  const host = () => {
    if (!context.gameHost?.available) throw new AppError(503, 'NET_HOST_UNAVAILABLE', '联机宿主暂不可用');
    return context.gameHost;
  };
  router.get('/:id', asyncHandler(async (request, response) =>
    sendSuccess(response, await host().view(gameId.parse(request.params.id), request.authUser!.id, request.get('X-Richman-Controller')))));
  router.post('/:id/claim', asyncHandler(async (request, response) => {
    const { controllerId } = z.strictObject({ controllerId: z.string().uuid() }).parse(request.body);
    return sendSuccess(response, await host().claim(gameId.parse(request.params.id), request.authUser!.id, controllerId));
  }));
  router.post('/:id/commands', asyncHandler(async (request, response) => {
    const input = intent.parse(request.body) as Intent, user = request.authUser!;
    return sendSuccess(response, await host().command(gameId.parse(request.params.id), user.id, user.authVersion, input, request.get('X-Richman-Controller')));
  }));
  router.post('/:id/recover', asyncHandler(async (request, response) => {
    const { pending } = z.strictObject({ pending: intent }).parse(request.body);
    return sendSuccess(response, await host().recover(gameId.parse(request.params.id), request.authUser!.id,
      request.get('X-Richman-Controller'), pending as Intent));
  }));
  router.post('/:id/disconnect', asyncHandler(async (request, response) => {
    const id = gameId.parse(request.params.id);
    await host().disconnect(id, request.authUser!.id, request.get('X-Richman-Controller'));
    return sendSuccess(response, { disconnected: true });
  }));
  return router;
}
