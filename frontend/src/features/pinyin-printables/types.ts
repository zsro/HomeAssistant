import type { WordPractice } from './words';

export const pinyinTopics = ['recognition', 'tones', 'friends', 'writing', 'word_spelling'] as const;
export type PinyinTopic = (typeof pinyinTopics)[number];
export type PinyinLevel = 'beginner' | 'blending';
export const levelLabels = { beginner: '入门', blending: '拼读' } as const;
export const topicLabels: Record<PinyinTopic, string> = {
  recognition: '认一认，找一找', tones: '声调读一读', friends: '拼音找朋友', writing: '看样写一写', word_spelling: '常用词语拼写',
};
export const topicDescriptions: Record<PinyinLevel, Record<PinyinTopic, { description: string; example: string }>> = {
  beginner: {
    recognition: { description: '照着示例，圈出相同的拼音字母', example: '找一找：b 和 d 有什么不同？' },
    tones: { description: '看着声调线，边读边用手比画', example: 'ā  á  ǎ  à' },
    friends: { description: '试着拼一拼，再给音节连线', example: 'b + ā → bā' },
    writing: { description: '看范字，描一次，再自己写两次', example: 'a  o  e · 四线三格' },
    word_spelling: { description: '看左边的词语，在右边四线格写拼音', example: '家人可以读词语，词库依次轮换' },
  },
  blending: {
    recognition: { description: '读韵母和整体认读音节，连出相同的朋友', example: 'ai  ang  zhi  yuan' },
    tones: { description: '先读四声，再圈出指定声调的音节', example: 'mā  má  mǎ  mà' },
    friends: { description: '读生活里的拼音，找到对应的简笔画', example: 'māo  yú  huā' },
    writing: { description: '读常见音节，在四线三格中少量练写', example: 'mā  lǜ  huā' },
    word_spelling: { description: '看左边的词语，在右边四线格写拼音', example: '生活常用词，学完一轮再复习' },
  },
};
export type PictureId = 'cat' | 'dog' | 'rabbit' | 'fish' | 'horse' | 'cow' | 'sheep' | 'bird' | 'flower' | 'tree' | 'melon' | 'rice';
export type PictureWord = { id: PictureId; pinyin: string; label: string };
export type BlendEntry = { initial: string; final: string; syllable: string };
export type RecognitionActivity = { kind: 'recognition'; topic: 'recognition'; rows: { target: string; choices: string[]; answerIndex: number }[] };
export type ToneActivity = { kind: 'tones'; topic: 'tones'; rows: { syllables: string[]; requestedTone: number | null }[] };
export type MatchItem = { id: string; text: string; picture?: PictureId; label?: string };
export type MatchActivity = { kind: 'matching'; topic: 'recognition' | 'friends'; left: MatchItem[]; right: MatchItem[]; example?: string };
export type WritingActivity = { kind: 'writing'; topic: 'writing'; models: string[] };
export type WordSpellingActivity = { kind: 'word_spelling'; topic: 'word_spelling'; words: WordPractice[] };
export type PinyinActivity = (RecognitionActivity | ToneActivity | MatchActivity | WritingActivity | WordSpellingActivity) & { units: number };
export type PinyinConfig = { level: PinyinLevel; topics: PinyinTopic[]; pageCount: number };
export type PinyinBatch = PinyinConfig & { seed: string; words: WordPractice[] };
export type PinyinWorksheet = PinyinBatch & { pages: PinyinActivity[][] };
