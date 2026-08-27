import type { DocumentType, MathWorksheet } from './types';

let fontRegistered = false;

export async function renderMathPdf(worksheet: MathWorksheet, documentType: DocumentType) {
  const [{ Font, pdf }, { MathPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./MathPdfDocument'),
  ]);
  if (!fontRegistered) {
    Font.register({ family: 'NotoSansSC', src: '/fonts/NotoSansSC.ttf' });
    fontRegistered = true;
  }
  return pdf(<MathPdfDocument worksheet={worksheet} documentType={documentType} />).toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
