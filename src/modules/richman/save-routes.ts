import { json, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { AppContext } from '../../app-context';
import { AppError } from '../../lib/app-error';
import { asyncHandler } from '../../lib/async-handler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { SAVE_BYTES, SAVE_HTTP_BYTES, SLOT_KEYS } from './save-contract';
import { SaveService } from './save-service';
import { WorkerSaveValidator } from './save-validator';
import type { SaveValidator } from './save-validator';

const slotSchema = z.enum(SLOT_KEYS);
const writeSchema = z.strictObject({
  requestId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  expectedSlotVersion: z.number().int().min(0).max(4_294_967_295),
  save: z.string().min(1),
});

export function createSaveRouter(context: AppContext, validator: SaveValidator = new WorkerSaveValidator()) {
  const router = Router(), service = new SaveService(context, validator);
  const owners = new Set<string>();
  router.use(authenticate(context));
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.get('/', asyncHandler(async (request, response) =>
    sendSuccess(response, { saves: await service.list(request.authUser!.id) })));
  router.get('/:slot', asyncHandler(async (request, response) =>
    sendSuccess(response, await service.read(request.authUser!.id, slotSchema.parse(request.params.slot)))));
  router.put('/:slot',
    rateLimit({
      windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false,
      keyGenerator: request => request.authUser!.id,
      handler: (_request, response) => response.status(429).json({
        success: false, error: { code: 'SAVE_RATE_LIMITED', message: '保存过于频繁，请稍后重试' },
      }),
    }),
    (request, response, next) => {
      if (!request.is('application/json')) return next(new AppError(415, 'SAVE_CONTENT_TYPE', '保存请求必须使用 application/json'));
      const owner = request.authUser!.id;
      if (owners.has(owner) || owners.size >= 4) {
        response.set('Retry-After', '2');
        return next(new AppError(503, 'SAVE_BUSY', '已有保存请求处理中，请稍后重试'));
      }
      owners.add(owner);
      let released = false;
      const release = () => { if (!released) { released = true; owners.delete(owner); } };
      response.once('finish', release);
      response.once('close', release);
      next();
    },
    // Mounted ahead of the application's 32 KB parser. Disable compressed input
    // so payload byte and request admission budgets remain meaningful.
    json({ limit: SAVE_HTTP_BYTES, inflate: false }),
    asyncHandler(async (request, response) => {
      const slot = slotSchema.parse(request.params.slot), input = writeSchema.parse(request.body);
      if (Buffer.byteLength(input.save, 'utf8') > SAVE_BYTES) throw new AppError(413, 'SAVE_TOO_LARGE', '存档超过 8 MiB 上限');
      const controller = new AbortController();
      const cancel = () => controller.abort();
      response.once('close', cancel);
      try {
        const user = request.authUser!;
        const result = await service.write(user.id, user.authVersion, slot, input, controller.signal);
        return sendSuccess(response, result);
      } finally { response.removeListener('close', cancel); }
    }),
  );
  return router;
}
