import type { BlendEntry, PictureWord } from './types';

// Reviewed literal entries: never construct arbitrary initial/final combinations.
// Orthography reference: https://www.moe.gov.cn/jyb_sjzl/ziliao/A19/195802/t19580201_186000.html
export const recognitionGroups = [
  ['b', 'd', 'p', 'q'], ['p', 'q', 'b', 'd'], ['m', 'n', 'h', 'f'], ['f', 't', 'l', 'h'],
  ['a', 'o', 'e', 'u'], ['o', 'a', 'e', 'ü'], ['e', 'o', 'i', 'a'], ['i', 'l', 'u', 'ü'],
  ['u', 'ü', 'o', 'a'], ['ü', 'u', 'i', 'e'], ['g', 'k', 'h', 'n'], ['j', 'q', 'x', 'z'],
  ['z', 'c', 's', 'x'], ['zh', 'ch', 'sh', 'r'], ['d', 'b', 'p', 'q'], ['q', 'p', 'b', 'd'],
] as const;
export const advancedRecognition = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong', 'zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si', 'yi', 'wu', 'yu', 'ye', 'yue', 'yuan', 'yin', 'yun', 'ying'] as const;
export const beginnerWriting = ['a', 'o', 'e', 'i', 'u', 'ü', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'] as const;
export const blendingWriting = ['mā', 'bà', 'dà', 'tǔ', 'nǐ', 'lǜ', 'nǚ', 'yú', 'mǎ', 'māo', 'gǒu', 'huā', 'shù', 'guā', 'mǐ', 'niú', 'yáng', 'niǎo'] as const;

export const vowelTones = [
  ['ā', 'á', 'ǎ', 'à'], ['ō', 'ó', 'ǒ', 'ò'], ['ē', 'é', 'ě', 'è'],
  ['ī', 'í', 'ǐ', 'ì'], ['ū', 'ú', 'ǔ', 'ù'], ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
] as const;
export const syllableTones = [
  ['mā', 'má', 'mǎ', 'mà'], ['bā', 'bá', 'bǎ', 'bà'], ['dā', 'dá', 'dǎ', 'dà'],
  ['tā', 'tá', 'tǎ', 'tà'], ['gū', 'gú', 'gǔ', 'gù'], ['hū', 'hú', 'hǔ', 'hù'],
  ['pī', 'pí', 'pǐ', 'pì'], ['tī', 'tí', 'tǐ', 'tì'], ['fū', 'fú', 'fǔ', 'fù'],
] as const;

export const blends: BlendEntry[] = [
  { initial: 'b', final: 'ā', syllable: 'bā' }, { initial: 'b', final: 'ǐ', syllable: 'bǐ' },
  { initial: 'b', final: 'ù', syllable: 'bù' }, { initial: 'b', final: 'ó', syllable: 'bó' },
  { initial: 'p', final: 'á', syllable: 'pá' }, { initial: 'p', final: 'í', syllable: 'pí' },
  { initial: 'p', final: 'ō', syllable: 'pō' }, { initial: 'p', final: 'ù', syllable: 'pù' },
  { initial: 'm', final: 'ā', syllable: 'mā' }, { initial: 'm', final: 'ǐ', syllable: 'mǐ' },
  { initial: 'm', final: 'ù', syllable: 'mù' }, { initial: 'm', final: 'ó', syllable: 'mó' },
  { initial: 'f', final: 'ā', syllable: 'fā' }, { initial: 'f', final: 'ó', syllable: 'fó' },
  { initial: 'f', final: 'ǔ', syllable: 'fǔ' }, { initial: 'd', final: 'à', syllable: 'dà' },
  { initial: 'd', final: 'ī', syllable: 'dī' }, { initial: 'd', final: 'ú', syllable: 'dú' },
  { initial: 'd', final: 'é', syllable: 'dé' }, { initial: 't', final: 'ā', syllable: 'tā' },
  { initial: 't', final: 'í', syllable: 'tí' }, { initial: 't', final: 'ǔ', syllable: 'tǔ' },
  { initial: 't', final: 'è', syllable: 'tè' }, { initial: 'n', final: 'á', syllable: 'ná' },
  { initial: 'n', final: 'ǐ', syllable: 'nǐ' }, { initial: 'n', final: 'ù', syllable: 'nù' },
  { initial: 'n', final: 'ǚ', syllable: 'nǚ' }, { initial: 'l', final: 'ā', syllable: 'lā' },
  { initial: 'l', final: 'í', syllable: 'lí' }, { initial: 'l', final: 'ù', syllable: 'lù' },
  { initial: 'l', final: 'ǜ', syllable: 'lǜ' }, { initial: 'g', final: 'ē', syllable: 'gē' },
  { initial: 'g', final: 'ǔ', syllable: 'gǔ' }, { initial: 'k', final: 'ǎ', syllable: 'kǎ' },
  { initial: 'k', final: 'ě', syllable: 'kě' }, { initial: 'k', final: 'ù', syllable: 'kù' },
  { initial: 'h', final: 'ā', syllable: 'hā' }, { initial: 'h', final: 'é', syllable: 'hé' },
  { initial: 'h', final: 'ǔ', syllable: 'hǔ' }, { initial: 'j', final: 'ī', syllable: 'jī' },
  { initial: 'q', final: 'í', syllable: 'qí' }, { initial: 'x', final: 'ǐ', syllable: 'xǐ' },
];

export const pictureWords: PictureWord[] = [
  { id: 'cat', pinyin: 'māo', label: '猫' }, { id: 'dog', pinyin: 'gǒu', label: '狗' },
  { id: 'rabbit', pinyin: 'tù', label: '兔' }, { id: 'fish', pinyin: 'yú', label: '鱼' },
  { id: 'horse', pinyin: 'mǎ', label: '马' }, { id: 'cow', pinyin: 'niú', label: '牛' },
  { id: 'sheep', pinyin: 'yáng', label: '羊' }, { id: 'bird', pinyin: 'niǎo', label: '鸟' },
  { id: 'flower', pinyin: 'huā', label: '花' }, { id: 'tree', pinyin: 'shù', label: '树' },
  { id: 'melon', pinyin: 'guā', label: '瓜' }, { id: 'rice', pinyin: 'mǐ', label: '米' },
];
