// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloneElement } from 'react';
import { Font, pdf } from '@react-pdf/renderer';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPinyinFonts } from './fonts';
import { createPinyinWorksheet } from './generator';
import { PinyinPdfDocument } from './PinyinPdfDocument';
import { requiredWordCount } from './layout';
import { initialWordProgress, takeNextWords, commonWords } from './words';
import { pinyinTopics } from './types';
import type { PinyinBatch, PinyinConfig } from './types';

const makeBatch = (config: PinyinConfig): PinyinBatch => ({ ...config, seed: 'PINYIN202609', words: takeNextWords(initialWordProgress(), requiredWordCount(config)).words });

type LayoutNode = {
  type: string;
  value?: string;
  box?: { width: number; height: number };
  children?: LayoutNode[];
  lines?: { string: string; runs: { attributes: { font?: { familyName?: string }[] }; glyphs: { codePoints: number[] }[] }[] }[];
};

beforeAll(async () => {
  await loadPinyinFonts({
    chinese: fileURLToPath(new URL('../../../public/fonts/NotoSansSC-Regular.ttf', import.meta.url)),
    pinyin: fileURLToPath(new URL('../../../public/fonts/Andika-Regular.ttf', import.meta.url)),
  });
});

async function render(batch: PinyinBatch) {
  let layout: LayoutNode | undefined;
  const element = cloneElement(PinyinPdfDocument({ worksheet: createPinyinWorksheet(batch) }), {
    onRender: (result: unknown) => { layout = (result as { _INTERNAL__LAYOUT__DATA_: LayoutNode })._INTERNAL__LAYOUT__DATA_; },
  });
  const blob = await pdf(element).toBlob();
  expect(blob.size).toBeGreaterThan(10000);
  expect(layout?.children).toHaveLength(batch.pageCount);
  const texts: { text: string; rendered: string }[] = [];
  const visit = (node: LayoutNode) => {
    const text = node.children?.filter((child) => child.type === 'TEXT_INSTANCE').map((child) => child.value ?? '').join('');
    if (node.type === 'TEXT' && node.lines && text) {
      expect(node.lines.length, `Missing text: ${text}`).toBeGreaterThan(0);
      expect(node.box?.width, `Zero width: ${text}`).toBeGreaterThan(0);
      texts.push({ text, rendered: node.lines.flatMap((line) => line.runs.flatMap((run) => run.glyphs.flatMap((glyph) => glyph.codePoints))).map((code) => String.fromCodePoint(code)).join('') });
    }
    node.children?.forEach(visit);
  };
  visit(layout!);
  return texts;
}

describe('actual pinyin PDF rendering', () => {
  it('embeds every Chinese character used by the document and content bank', () => {
    const font = Font.getFont({ fontFamily: 'PinyinChinese' }).data!;
    for (const filename of ['PinyinPdfDocument.tsx', 'types.ts', 'bank.ts', 'words.ts']) {
      const source = readFileSync(new URL(filename, import.meta.url), 'utf8');
      for (const character of new Set(source.match(/[\u3400-\u9fff]/g))) {
        expect(font.hasGlyphForCodePoint(character.codePointAt(0)!), `Missing Chinese glyph: ${character}`).toBe(true);
      }
    }
  });

  it('preserves the worked example and huā after composed vowels and repeated renders', async () => {
    const batch = makeBatch({ level: 'beginner', topics: ['recognition', 'tones', 'friends', 'writing'], pageCount: 2 });
    const first = await render(batch);
    expect(first.find(({ text }) => text === 'b + ā → bā')?.rendered).toBe('b + ā → bā');
    await render(batch);
    const next = await render({ ...batch, level: 'blending' });
    expect(next.find(({ text }) => text === 'huā')?.rendered).toBe('huā');
    expect(next.find(({ text }) => text === 'un')?.rendered).toBe('un');
    for (const { text } of batch.words) expect(first.find((item) => item.text === text)?.rendered).toBe(text);
    expect(first.some(({ text }) => /陪练参考|连线：|答案/.test(text))).toBe(false);
  });

  it('renders one-page and six-page boundaries with no lost text blocks', async () => {
    for (const level of ['beginner', 'blending'] as const) {
      await render(makeBatch({ level, topics: ['writing'], pageCount: 1 }));
      await render(makeBatch({ level, topics: ['word_spelling'], pageCount: 1 }));
      await render(makeBatch({ level, topics: [...pinyinTopics], pageCount: 6 }));
    }
  });

  it('renders all vocabulary characters in real word-only pages', async () => {
    let progress = initialWordProgress();
    for (let offset = 0; offset < commonWords.length; offset += 90) {
      const selection = takeNextWords(progress, 90);
      const output = await render({ seed: 'ALLWORDS', level: 'blending', topics: ['word_spelling'], pageCount: 6, words: selection.words });
      for (const word of selection.words) expect(output.find(({ text }) => text === word.text)?.rendered).toBe(word.text);
      progress = selection.next;
    }
  });
});
