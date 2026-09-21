import { commonWords, initialWordProgress } from './words';
import type { WordProgress } from './words';

export class WordProgressError extends Error {}
export const wordProgressKey = (userId: string) => `home-assistant.pinyin-word-cycle.v1:${userId}`;
const wordIds = new Set(commonWords.map(({ text }) => text));

export function readWordProgress(userId: string): WordProgress {
  try {
    const raw = localStorage.getItem(wordProgressKey(userId));
    if (raw === null) return initialWordProgress();
    const value = JSON.parse(raw) as Partial<WordProgress>;
    if (value.version !== 1 || !Number.isSafeInteger(value.cycle) || value.cycle! < 1 || !Array.isArray(value.completed)
      || value.completed.some((word) => typeof word !== 'string' || !wordIds.has(word))
      || new Set(value.completed).size !== value.completed.length) throw new Error('Invalid stored progress');
    return value as WordProgress;
  } catch {
    throw new WordProgressError('无法读取词语轮换进度，请允许浏览器保存网站数据后重试。已保存的进度不会自动重置。');
  }
}

export function writeWordProgress(userId: string, progress: WordProgress) {
  try { localStorage.setItem(wordProgressKey(userId), JSON.stringify(progress)); }
  catch { throw new WordProgressError('无法保存词语轮换进度，请允许浏览器保存网站数据或释放空间后重试。'); }
}

export async function withWordProgressLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
  // A batch holds the account lock through rendering and download dispatch, so two
  // tabs cannot consume the same slice. Web Locks is available on our HTTPS site.
  if (!navigator.locks) throw new WordProgressError('词语轮换需要安全连接，请通过 HTTPS 或本机预览地址打开，并使用新版浏览器。');
  return navigator.locks.request(wordProgressKey(userId), work);
}
