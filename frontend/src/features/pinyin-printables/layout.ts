import { pinyinTopics } from './types';
import type { PinyinConfig, PinyinTopic } from './types';

export const MAX_PINYIN_PAGES = 6;
export const ACTIVITY_HEIGHT = 230;
export const WORD_ROW_HEIGHT = 42;
export const minimumPinyinPages = (topicCount: number) => Math.max(1, Math.ceil(topicCount / 3));
export const wordCapacity = (units: number) => Math.floor((units * ACTIVITY_HEIGHT - 56) / WORD_ROW_HEIGHT);
export type PinyinPlacement = { topic: PinyinTopic; units: number };

export function planPinyinPages(config: PinyinConfig): PinyinPlacement[][] {
  const topics = pinyinTopics.filter((topic) => config.topics.includes(topic));
  if (!['beginner', 'blending'].includes(config.level) || !topics.length || topics.length !== config.topics.length) throw new Error('Invalid pinyin configuration');
  if (!Number.isInteger(config.pageCount) || config.pageCount < minimumPinyinPages(topics.length) || config.pageCount > MAX_PINYIN_PAGES) throw new Error('Invalid pinyin page count');
  const pages: PinyinPlacement[][] = Array.from({ length: config.pageCount }, () => []);
  if (!topics.includes('word_spelling')) {
    for (let index = 0; index < config.pageCount * 3; index += 1) pages[Math.floor(index / 3)].push({ topic: topics[index % topics.length], units: 1 });
    return pages;
  }
  // Give each selected core activity one third-page, then dedicate every remaining
  // slot to spelling. Adjacent spelling slots on a page form one larger block.
  const coreTopics = topics.filter((topic) => topic !== 'word_spelling');
  for (let index = 0; index < coreTopics.length; index += 1) pages[Math.floor(index / 3)].push({ topic: coreTopics[index], units: 1 });
  for (const page of pages) {
    const remaining = 3 - page.length;
    if (remaining) page.push({ topic: 'word_spelling', units: remaining });
  }
  return pages;
}

export function requiredWordCount(config: PinyinConfig) {
  return planPinyinPages(config).flat().reduce((count, placement) => count + (placement.topic === 'word_spelling' ? wordCapacity(placement.units) : 0), 0);
}
