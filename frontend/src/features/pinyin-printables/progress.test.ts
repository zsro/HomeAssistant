import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadPinyinBatch } from './download';
import { readWordProgress, wordProgressKey, writeWordProgress } from './progress';
import { downloadBlob, renderPinyinPdf } from './render';
import { commonWords, initialWordProgress, takeNextWords } from './words';
import { pinyinTopics } from './types';

vi.mock('./render', () => ({ renderPinyinPdf: vi.fn(), downloadBlob: vi.fn() }));
const render = vi.mocked(renderPinyinPdf);
const download = vi.mocked(downloadBlob);
const config = { level: 'beginner' as const, topics: [...pinyinTopics], pageCount: 2 };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  render.mockResolvedValue(new Blob(['pdf']));
  download.mockImplementation(() => undefined);
  // Serialize requests as the browser's cross-tab Web Locks implementation does.
  let queue = Promise.resolve<unknown>(undefined);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_name: string, work: () => Promise<unknown>) => {
    const next = queue.then(work);
    queue = next.catch(() => undefined);
    return next;
  } } });
});

describe('durable vocabulary rotation', () => {
  it('isolates accounts, preserves progress on reading, and shares one cycle across levels', async () => {
    const first = await downloadPinyinBatch('alice', config);
    const bob = await downloadPinyinBatch('bob', config);
    expect(first.words).toEqual(bob.words);
    const advanced = await downloadPinyinBatch('alice', { ...config, level: 'blending' });
    expect(advanced.words[0].text).toBe(commonWords[9].text);
    expect(readWordProgress('alice').completed).toHaveLength(18);
    expect(readWordProgress('bob').completed).toHaveLength(9);
  });

  it('does not skip words on PDF failure or advance for a re-download or word-free selection', async () => {
    render.mockRejectedValueOnce(new Error('font failed'));
    await expect(downloadPinyinBatch('alice', config)).rejects.toThrow('font failed');
    expect(readWordProgress('alice').completed).toHaveLength(0);
    const first = await downloadPinyinBatch('alice', config);
    const progress = readWordProgress('alice');
    await downloadPinyinBatch('alice', config, first);
    await downloadPinyinBatch('alice', { ...config, topics: ['writing'], pageCount: 1 });
    expect(readWordProgress('alice')).toEqual(progress);
    expect(render.mock.calls[0][0].words).toEqual(first.words);
  });

  it('refuses to download when progress cannot be saved and rolls back a dispatch failure', async () => {
    const store = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await expect(downloadPinyinBatch('alice', config)).rejects.toThrow('无法保存');
    expect(download).not.toHaveBeenCalled();
    expect(readWordProgress('alice').completed).toHaveLength(0);
    store.mockRestore();
    download.mockImplementationOnce(() => { throw new Error('dispatch failed'); });
    await expect(downloadPinyinBatch('alice', config)).rejects.toThrow('dispatch failed');
    expect(readWordProgress('alice').completed).toHaveLength(0);
    const retry = await downloadPinyinBatch('alice', config);
    expect(retry.words[0].text).toBe(commonWords[0].text);
  });

  it('keeps two concurrent tab requests from printing the same words', async () => {
    const [first, second] = await Promise.all([downloadPinyinBatch('alice', config), downloadPinyinBatch('alice', config)]);
    expect(new Set([...first.words, ...second.words].map(({ text }) => text)).size).toBe(18);
    expect(readWordProgress('alice').completed).toHaveLength(18);
  });

  it('finishes the current cycle before entering the next, and preserves cross-cycle re-downloads', async () => {
    writeWordProgress('alice', takeNextWords(initialWordProgress(), commonWords.length - 3).next);
    const batch = await downloadPinyinBatch('alice', config);
    expect(batch.words.map(({ cycle }) => cycle)).toEqual([1, 1, 1, 2, 2, 2, 2, 2, 2]);
    expect(batch.words.slice(0, 3).map(({ text }) => text)).toEqual(commonWords.slice(-3).map(({ text }) => text));
    const saved = readWordProgress('alice');
    await downloadPinyinBatch('alice', config, batch);
    expect(readWordProgress('alice')).toEqual(saved);
    expect(saved.cycle).toBe(2);
    expect(saved.completed).toHaveLength(6);
  });

  it('does not silently reset corrupt storage or print without a cross-tab lock', async () => {
    for (const raw of ['broken', '{"version":1,"cycle":0,"completed":[]}', '{"version":1,"cycle":1,"completed":["missing"]}']) {
      localStorage.setItem(wordProgressKey('alice'), raw);
      await expect(downloadPinyinBatch('alice', config)).rejects.toThrow('无法读取');
      expect(localStorage.getItem(wordProgressKey('alice'))).toBe(raw);
    }
    localStorage.clear();
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    await expect(downloadPinyinBatch('alice', config)).rejects.toThrow('HTTPS');
    expect(download).not.toHaveBeenCalled();
  });
});
