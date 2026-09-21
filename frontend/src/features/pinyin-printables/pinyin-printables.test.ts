import { describe, expect, it } from 'vitest';
import { advancedRecognition, blends, pictureWords, vowelTones } from './bank';
import { createPinyinWorksheet, minimumPinyinPages } from './generator';
import { requiredWordCount, planPinyinPages } from './layout';
import { initialWordProgress, takeNextWords, commonWords } from './words';
import { pinyinTopics } from './types';
import type { PinyinBatch, PinyinLevel, PinyinTopic } from './types';

const config = { level: 'beginner' as const, topics: [...pinyinTopics], pageCount: 2 };
const base: PinyinBatch = { ...config, seed: 'PINYINTEST01', words: takeNextWords(initialWordProgress(), requiredWordCount(config)).words };
function createBatch(overrides: Partial<PinyinBatch> = {}): PinyinBatch {
  const batch = { ...base, ...overrides };
  return { ...batch, words: takeNextWords(initialWordProgress(), requiredWordCount(batch)).words };
}

describe('pinyin content and reproducible generation', () => {
  it('uses reviewed, unique literal combinations and twelve distinct pictures', () => {
    expect(blends.length).toBeGreaterThanOrEqual(36);
    expect(new Set(blends.map(({ syllable }) => syllable)).size).toBe(blends.length);
    for (const blend of blends) expect(blend.initial + blend.final).toBe(blend.syllable);
    expect(pictureWords).toHaveLength(12);
    expect(new Set(pictureWords.map(({ id }) => id)).size).toBe(12);
    expect(new Set(pictureWords.map(({ pinyin }) => pinyin)).size).toBe(12);
    expect(blends).toContainEqual({ initial: 'n', final: 'ǚ', syllable: 'nǚ' });
    expect(blends).toContainEqual({ initial: 'l', final: 'ǜ', syllable: 'lǜ' });
    expect(vowelTones[3]).toEqual(['ī', 'í', 'ǐ', 'ì']);
    expect(vowelTones[5]).toEqual(['ǖ', 'ǘ', 'ǚ', 'ǜ']);
    expect(advancedRecognition).toEqual(expect.arrayContaining(['zhi', 'yue', 'yuan', 'ün', 'üe']));
  });

  it('reproduces a batch for separate documents and changes with a new seed', () => {
    expect(createPinyinWorksheet(base)).toEqual(createPinyinWorksheet(base));
    expect(createPinyinWorksheet({ ...base, seed: 'PINYINTEST02' })).not.toEqual(createPinyinWorksheet(base));
  });

  it.each<PinyinLevel>(['beginner', 'blending'])('keeps %s activities unique within each block and answers unambiguous', (level) => {
    for (let iteration = 0; iteration < 50; iteration += 1) {
      const worksheet = createPinyinWorksheet(createBatch({ seed: `CHECK${iteration}`, level, pageCount: 6 }));
      for (const activity of worksheet.pages.flat()) {
        if (activity.kind === 'recognition') {
          expect(level).toBe('beginner');
          expect(new Set(activity.rows.map(({ target }) => target)).size).toBe(4);
          for (const row of activity.rows) {
            expect(row.choices.filter((choice) => choice === row.target)).toHaveLength(1);
            expect(row.choices[row.answerIndex]).toBe(row.target);
          }
        } else if (activity.kind === 'matching') {
          expect(new Set(activity.left.map(({ id }) => id)).size).toBe(activity.left.length);
          expect(activity.left.map(({ id }) => id).sort()).toEqual(activity.right.map(({ id }) => id).sort());
          expect(activity.right.some((item, index) => item.id !== activity.left[index].id)).toBe(true);
          if (activity.topic === 'friends') {
            expect(activity.right.every((item) => Boolean(item.picture) === (level === 'blending'))).toBe(true);
          }
        } else if (activity.kind === 'writing') {
          expect(new Set(activity.models).size).toBe(3);
        } else if (activity.kind === 'tones') {
          expect(new Set(activity.rows.map(({ syllables }) => syllables[0])).size).toBe(4);
          for (const row of activity.rows) {
            expect(row.syllables).toHaveLength(4);
            if (level === 'beginner') expect(row.requestedTone).toBeNull();
            else expect(row.requestedTone).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe('pinyin thirds layout and vocabulary', () => {
  it('uses three blocks on page one and gives spelling the remainder of page two', () => {
    expect(planPinyinPages(base)).toEqual([
      [{ topic: 'recognition', units: 1 }, { topic: 'tones', units: 1 }, { topic: 'friends', units: 1 }],
      [{ topic: 'writing', units: 1 }, { topic: 'word_spelling', units: 2 }],
    ]);
    expect(requiredWordCount(base)).toBe(9);
  });

  it('fills every supported selection and page count with no split activities or blank pages', () => {
    for (let mask = 1; mask < 32; mask += 1) {
      const topics = pinyinTopics.filter((_, index) => mask & (1 << index));
      for (let pageCount = minimumPinyinPages(topics.length); pageCount <= 6; pageCount += 1) {
        const batch = createBatch({ topics, pageCount });
        const worksheet = createPinyinWorksheet(batch);
        expect(worksheet.pages).toHaveLength(pageCount);
        expect(worksheet.pages.every((page) => page.length > 0 && page.length <= 3 && page.reduce((sum, activity) => sum + activity.units, 0) === 3)).toBe(true);
        expect(new Set(worksheet.pages.flat().map(({ topic }) => topic))).toEqual(new Set(topics));
        expect(worksheet.pages.flat().flatMap((activity) => activity.kind === 'word_spelling' ? activity.words : [])).toEqual(batch.words);
        if (!topics.includes('word_spelling')) expect(worksheet.pages.every((page) => page.length === 3)).toBe(true);
      }
    }
  });

  it('supports a whole page of words and gives extra pages entirely to words', () => {
    const one = createPinyinWorksheet(createBatch({ topics: ['word_spelling'], pageCount: 1 }));
    expect(one.pages[0]).toHaveLength(1);
    expect(one.pages[0][0].units).toBe(3);
    expect(one.words).toHaveLength(15);
    const six = createPinyinWorksheet(createBatch({ pageCount: 6 }));
    expect(six.words).toHaveLength(69);
    expect(six.pages.slice(2).every((page) => page.length === 1 && page[0].topic === 'word_spelling' && page[0].units === 3)).toBe(true);
  });

  it('contains at least 400 distinct everyday words of practical writing length', () => {
    expect(commonWords.length).toBeGreaterThanOrEqual(400);
    expect(new Set(commonWords.map(({ text }) => text)).size).toBe(commonWords.length);
    expect(commonWords.every(({ text }) => /^[\u4e00-\u9fff]{2,3}$/.test(text))).toBe(true);
  });

  it('covers the full vocabulary before repeating, including batches crossing cycle boundaries', () => {
    let progress = initialWordProgress();
    const emitted = [];
    for (let batch = 0; batch < 100; batch += 1) {
      const { words, next } = takeNextWords(progress, batch % 2 ? 9 : 15);
      expect(new Set(words.map(({ text }) => text)).size).toBe(words.length);
      emitted.push(...words);
      progress = next;
    }
    const expected = commonWords.map(({ text }) => text);
    for (const cycle of [1, 2]) {
      const round = emitted.filter((word) => word.cycle === cycle);
      expect(round.map(({ text }) => text)).toEqual(expected);
      expect(round.map(({ position }) => position)).toEqual(expected.map((_, index) => index + 1));
    }
  });

  it('rejects invalid configuration and incomplete word snapshots', () => {
    for (const pageCount of [0, 1, 1.5, 7, NaN]) expect(() => createPinyinWorksheet({ ...base, pageCount })).toThrow();
    for (const topics of [[], ['writing', 'writing'], ['unknown']] as PinyinTopic[][]) expect(() => createPinyinWorksheet({ ...base, topics })).toThrow();
    expect(() => createPinyinWorksheet({ ...base, level: 'unknown' as PinyinLevel })).toThrow();
    expect(() => createPinyinWorksheet({ ...base, words: [] })).toThrow();
  });
});
