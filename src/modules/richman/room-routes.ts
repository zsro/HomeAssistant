import { json, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AppContext } from '../../app-context';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { RoomService } from './room-service';
import { INITIAL_FUNDS } from '../../../shared/richman/game/economy';
import { CHARACTER_IDS } from '../../../shared/richman/content';
const id = z.string().uuid(), revision = z.number().int().nonnegative().max(4_294_967_294);
const change = z.strictObject({ revision, action: z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready'), ready: z.boolean() }),
  z.strictObject({ type: z.literal('character'), characterId: z.enum(CHARACTER_IDS) }),
  z.strictObject({ type: z.literal('seat'), position: z.number().int().min(0).max(3), kind: z.enum(['open', 'closed', 'ai']) }),
  z.strictObject({ type: z.literal('funds'), initialFunds: z.number().int().refine(n => INITIAL_FUNDS.includes(n)) }),
  z.strictObject({ type: z.literal('leave') }),
]) });
export function createRoomRouter(context: AppContext) {
  const router = Router(), service = new RoomService(context);
  router.use(authenticate(context));
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(rateLimit({ windowMs: 60000, limit: 180, keyGenerator: req => req.authUser!.id, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use(json({ limit: '2kb', inflate: false }));
  const admission = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: req => req.authUser!.id, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'ROOM_RATE_LIMITED', message: '建房或加入过于频繁，请稍后重试' } }) });
  router.get('/', asyncHandler(async (req, res) => sendSuccess(res, await service.list(req.authUser!.id))));
  router.post('/', admission, asyncHandler(async (req, res) => {
    const input = z.strictObject({ id }).parse(req.body), u = req.authUser!;
    return sendSuccess(res, await service.create(input.id, u.id, u.authVersion));
  }));
  router.post('/join', admission, asyncHandler(async (req, res) => {
    const { code } = z.strictObject({ code: z.string().regex(/^[A-F0-9]{12}$/) }).parse(req.body), u = req.authUser!;
    return sendSuccess(res, await service.join(code, u.id, u.authVersion));
  }));
  router.get('/:id', asyncHandler(async (req, res) => sendSuccess(res, await service.view(id.parse(req.params.id), req.authUser!.id))));
  router.post('/:id/change', asyncHandler(async (req, res) => {
    const input = change.parse(req.body), u = req.authUser!;
    return sendSuccess(res, await service.change(id.parse(req.params.id), u.id, u.authVersion, input.revision, input.action));
  }));
  router.post('/:id/start', asyncHandler(async (req, res) => {
    const input = z.strictObject({ revision }).parse(req.body), u = req.authUser!;
    return sendSuccess(res, await service.start(id.parse(req.params.id), u.id, u.authVersion, input.revision));
  }));
  return router;
}
