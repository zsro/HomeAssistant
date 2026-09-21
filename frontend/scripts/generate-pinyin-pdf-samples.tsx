import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import { loadPinyinFonts } from '../src/features/pinyin-printables/fonts';
import { createPinyinWorksheet } from '../src/features/pinyin-printables/generator';
import { PinyinPdfDocument } from '../src/features/pinyin-printables/PinyinPdfDocument';
import { requiredWordCount } from '../src/features/pinyin-printables/layout';
import { takeNextWords, initialWordProgress } from '../src/features/pinyin-printables/words';
import { pinyinTopics } from '../src/features/pinyin-printables/types';

const outputDirectory = fileURLToPath(new URL('../../output/pdf/', import.meta.url));
await loadPinyinFonts({
  chinese: fileURLToPath(new URL('../public/fonts/NotoSansSC-Regular.ttf', import.meta.url)),
  pinyin: fileURLToPath(new URL('../public/fonts/Andika-Regular.ttf', import.meta.url)),
});
await mkdir(outputDirectory, { recursive: true });
for (const level of ['beginner', 'blending'] as const) {
  const config = { level, topics: [...pinyinTopics], pageCount: 2 };
  const { words } = takeNextWords(initialWordProgress(), requiredWordCount(config));
  const worksheet = createPinyinWorksheet({ ...config, seed: 'PINYIN202609', words });
  await renderToFile(<PinyinPdfDocument worksheet={worksheet} />, `${outputDirectory}/kindergarten-pinyin-${level}-worksheet-sample.pdf`);
}
