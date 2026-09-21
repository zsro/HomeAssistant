import { createRandom } from '../math-printables/random';
import type { RandomSource } from '../math-printables/random';
import { advancedRecognition, beginnerWriting, blendingWriting, blends, pictureWords, recognitionGroups, syllableTones, vowelTones } from './bank';
import { planPinyinPages, requiredWordCount, wordCapacity } from './layout';
import { commonWords } from './words';
import type { MatchItem, PinyinActivity, PinyinBatch, PinyinLevel, PinyinTopic, PinyinWorksheet, RecognitionActivity, ToneActivity, MatchActivity, WritingActivity } from './types';

export { MAX_PINYIN_PAGES, minimumPinyinPages } from './layout';

// Even an unlucky shuffle should leave something to connect, rather than all straight rows.
function shuffledPartners(items: MatchItem[], random: RandomSource) {
  const shuffled = random.shuffle(items);
  if (shuffled.every((item, index) => item.id === items[index].id)) shuffled.push(shuffled.shift()!);
  return shuffled;
}

function activity(topic: Exclude<PinyinTopic, 'word_spelling'>, level: PinyinLevel, random: RandomSource): RecognitionActivity | ToneActivity | MatchActivity | WritingActivity {
  if (topic === 'recognition' && level === 'beginner') {
    return { kind: 'recognition', topic, rows: random.shuffle(recognitionGroups).slice(0, 4).map((group) => {
      const target = group[0];
      const choices = random.shuffle<string>(group);
      return { target, choices, answerIndex: choices.indexOf(target) };
    }) };
  }
  if (topic === 'tones') {
    const bank: readonly (readonly string[])[] = level === 'beginner' ? vowelTones : syllableTones;
    return { kind: 'tones', topic, rows: random.shuffle(bank).slice(0, 4).map((syllables) => ({
      syllables: [...syllables], requestedTone: level === 'beginner' ? null : random.int(1, 4),
    })) };
  }
  if (topic === 'writing') {
    const bank: readonly string[] = level === 'beginner' ? beginnerWriting : blendingWriting;
    return { kind: 'writing', topic, models: random.shuffle(bank).slice(0, 3) };
  }
  if (topic === 'recognition') {
    const left = random.shuffle(advancedRecognition).slice(0, 4).map((text) => ({ id: text, text }));
    return { kind: 'matching', topic, left, right: shuffledPartners(left, random) };
  }
  if (level === 'beginner') {
    // The worked example is separate from the three practice pairs.
    const entries = random.shuffle(blends.filter((entry) => entry.syllable !== 'bā')).slice(0, 3);
    const left = entries.map((entry) => ({ id: entry.syllable, text: `${entry.initial} + ${entry.final}` }));
    const right = entries.map((entry) => ({ id: entry.syllable, text: entry.syllable }));
    return { kind: 'matching', topic, left, right: shuffledPartners(right, random), example: 'b + ā → bā' };
  }
  const words = random.shuffle(pictureWords).slice(0, 4);
  const left = words.map((word) => ({ id: word.id, text: word.pinyin }));
  const right = words.map((word) => ({ id: word.id, text: word.pinyin, picture: word.id, label: word.label }));
  return { kind: 'matching', topic, left, right: shuffledPartners(right, random) };
}

export function createPinyinWorksheet(batch: PinyinBatch): PinyinWorksheet {
  const { seed, level, pageCount } = batch;
  const placements = planPinyinPages(batch);
  if (!seed) throw new Error('Invalid pinyin seed');
  const expected = requiredWordCount(batch);
  const known = new Map(commonWords.map((word) => [word.text, word.category]));
  if (batch.words.length !== expected || batch.words.some((word) => known.get(word.text) !== word.category
    || !Number.isSafeInteger(word.cycle) || word.cycle < 1 || !Number.isInteger(word.position) || word.position < 1 || word.position > commonWords.length)
    || new Set(batch.words.map((word) => word.text)).size !== expected) throw new Error('Invalid word selection');
  const topics = [...new Set(placements.flat().map(({ topic }) => topic))];
  const random = createRandom(`${seed}:${level}:${topics.join(',')}:${pageCount}`);
  let wordIndex = 0;
  const pages: PinyinActivity[][] = placements.map((page) => page.map(({ topic, units }) => {
    if (topic === 'word_spelling') {
      const words = batch.words.slice(wordIndex, wordIndex + wordCapacity(units));
      wordIndex += words.length;
      return { kind: 'word_spelling', topic, units, words };
    }
    return { ...activity(topic, level, random), units };
  }));
  return { ...batch, topics, pages };
}
