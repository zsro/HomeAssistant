import { createBatchSeed } from '../math-printables/random';
import { createPinyinWorksheet } from './generator';
import { requiredWordCount } from './layout';
import { readWordProgress, withWordProgressLock, writeWordProgress } from './progress';
import { takeNextWords } from './words';
import { levelLabels } from './types';
import { downloadBlob, renderPinyinPdf } from './render';
import type { PinyinBatch, PinyinConfig } from './types';

// A re-download consumes no words. A new download snapshots its words in the
// batch, then commits progress only after rendering succeeds.
export async function downloadPinyinBatch(userId: string, config: PinyinConfig, existing?: PinyinBatch): Promise<PinyinBatch> {
  const prepare = async (batch: PinyinBatch) => {
    const blob = await renderPinyinPdf(createPinyinWorksheet(batch));
    return () => downloadBlob(blob, `幼儿园拼音-${levelLabels[batch.level]}-练习-${batch.seed}.pdf`);
  };
  if (existing) {
    (await prepare(existing))();
    return existing;
  }
  const count = requiredWordCount(config);
  if (!count) {
    const batch = { ...config, seed: createBatchSeed(), words: [] };
    (await prepare(batch))();
    return batch;
  }
  return withWordProgressLock(userId, async () => {
    const before = readWordProgress(userId);
    const selection = takeNextWords(before, count);
    const batch = { ...config, seed: createBatchSeed(), words: selection.words };
    const download = await prepare(batch);
    // Persist before dispatch: storage denial must not silently lose progress.
    writeWordProgress(userId, selection.next);
    try { download(); }
    catch (error) { writeWordProgress(userId, before); throw error; }
    return batch;
  });
}
