import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { AppError } from '../../lib/app-error';
import { SAVE_BYTES, SAVE_TIMEOUT_MS } from './save-contract';
import type { SaveSummary, WorkerReply } from './save-contract';

export interface SaveValidator {
  validate(serialized: string, signal?: AbortSignal): Promise<SaveSummary>;
}

/** No queue: abandoned requests cannot accumulate replay CPU or unbounded memory. */
export class WorkerSaveValidator implements SaveValidator {
  private running = 0;
  constructor(
    private readonly workerPath = path.resolve(__dirname, '../../../',
      __filename.endsWith('.ts') ? 'dist/workers/richman-save.js' : 'workers/richman-save.js'),
    private readonly timeoutMs = SAVE_TIMEOUT_MS,
  ) {}

  async validate(serialized: string, signal?: AbortSignal): Promise<SaveSummary> {
    if (Buffer.byteLength(serialized, 'utf8') > SAVE_BYTES) throw new AppError(413, 'SAVE_TOO_LARGE', '存档超过 8 MiB 上限');
    if (signal?.aborted) throw new AppError(499, 'SAVE_CANCELLED', '保存请求已取消');
    if (this.running >= 2) throw new AppError(503, 'SAVE_BUSY', '存档校验繁忙，请稍后重试');
    this.running++;
    let worker: Worker | undefined;
    try {
      worker = new Worker(this.workerPath, { workerData: serialized, resourceLimits: { maxOldGenerationSizeMb: 256 } });
      return await new Promise<SaveSummary>((resolve, reject) => {
        const timer = setTimeout(() => reject(new AppError(422, 'SAVE_RESTORE_TIMEOUT', '存档恢复超过 30 秒，请缩短对局历史')), this.timeoutMs);
        const abort = () => reject(new AppError(499, 'SAVE_CANCELLED', '保存请求已取消'));
        signal?.addEventListener('abort', abort, { once: true });
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
        worker!.once('message', (reply: WorkerReply) => {
          cleanup();
          if (reply.ok) resolve(reply.summary);
          else reject(new AppError(422, 'SAVE_INVALID', reply.message, { reason: reply.code }));
        });
        worker!.once('error', () => { cleanup(); reject(new AppError(503, 'SAVE_VALIDATOR_FAILED', '存档校验服务暂不可用')); });
        worker!.once('exit', () => { cleanup(); reject(new AppError(503, 'SAVE_VALIDATOR_FAILED', '存档校验未完成')); });
      });
    } finally {
      // Keep capacity reserved until termination completes, including timeout/abort.
      if (worker) await worker.terminate();
      this.running--;
    }
  }
}
