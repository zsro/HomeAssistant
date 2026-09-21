import type { PinyinWorksheet } from './types';

export async function renderPinyinPdf(worksheet: PinyinWorksheet) {
  const [{ pdf }, { PinyinPdfDocument }, { loadPinyinFonts }] = await Promise.all([
    import('@react-pdf/renderer'), import('./PinyinPdfDocument'), import('./fonts'),
  ]);
  await loadPinyinFonts();
  return pdf(<PinyinPdfDocument worksheet={worksheet} />).toBlob();
}

export { downloadBlob } from '../math-printables/render';
