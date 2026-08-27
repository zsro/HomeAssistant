import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Font, renderToFile } from '@react-pdf/renderer';
import { MathPdfDocument } from '../src/features/math-printables/MathPdfDocument';
import { createMathWorksheet } from '../src/features/math-printables/generator';
import { mathTopics } from '../src/features/math-printables/types';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputDirectory = `${projectRoot}/output/pdf`;
const fontPath = fileURLToPath(new URL('../public/fonts/NotoSansSC.ttf', import.meta.url));
const worksheet = createMathWorksheet('MATHQA202608', [...mathTopics], 2);

Font.register({ family: 'NotoSansSC', src: fontPath });
await mkdir(outputDirectory, { recursive: true });

await renderToFile(
  <MathPdfDocument worksheet={worksheet} documentType="worksheet" />,
  `${outputDirectory}/kindergarten-math-worksheet-sample.pdf`,
);
await renderToFile(
  <MathPdfDocument worksheet={worksheet} documentType="answers" />,
  `${outputDirectory}/kindergarten-math-answers-sample.pdf`,
);
