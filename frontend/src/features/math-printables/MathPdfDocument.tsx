import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { UNITS_PER_PAGE } from './layout';
import { mathTopicLabels } from './types';
import type {
  DocumentType,
  MathQuestion,
  MathWorksheet,
  PyramidQuestion,
  SudokuQuestion,
  TopicPlacement,
} from './types';

const PAGE_CONTENT_HEIGHT = 720;
const UNIT_HEIGHT = PAGE_CONTENT_HEIGHT / UNITS_PER_PAGE;

const styles = StyleSheet.create({
  page: {
    color: '#202020',
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansSC',
    fontSize: 10,
  },
  pageFrame: { height: 841.89, flexShrink: 0 },
  header: {
    position: 'absolute',
    top: 24,
    left: 30,
    right: 30,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.2,
    borderBottomColor: '#202020',
    paddingBottom: 7,
  },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  headerMeta: { marginTop: 4, color: '#555555', fontSize: 8.5 },
  identity: { width: 205, marginTop: 2 },
  identityLine: { marginBottom: 10, fontSize: 9.5 },
  content: {
    position: 'absolute',
    top: 80,
    left: 30,
    right: 30,
    height: PAGE_CONTENT_HEIGHT,
  },
  section: {
    flexShrink: 0,
    borderBottomWidth: 0.7,
    borderBottomColor: '#b8b8b8',
    paddingTop: 7,
    paddingHorizontal: 9,
    overflow: 'hidden',
  },
  sectionHeader: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 12, fontWeight: 700 },
  sectionHint: { color: '#777777', fontSize: 7.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  thirdCell: { width: '33.333%', paddingRight: 10 },
  halfCell: { width: '50%', paddingRight: 8, paddingBottom: 7 },
  fullCell: { width: '100%', paddingBottom: 7 },
  equationRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  equation: { fontSize: 15 },
  methodCard: {
    minHeight: 76,
    borderWidth: 0.6,
    borderColor: '#c7c7c7',
    borderRadius: 4,
    padding: 6,
  },
  methodTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  methodLabel: { color: '#666666', fontSize: 7.5 },
  methodPrompt: { fontSize: 13 },
  methodStep: { color: '#555555', fontSize: 9 },
  patternCard: { minHeight: 74, paddingTop: 3 },
  patternRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  patternCell: {
    width: 44,
    height: 27,
    marginRight: 7,
    borderWidth: 0.7,
    borderColor: '#777777',
    borderRadius: 3,
    textAlign: 'center',
    paddingTop: 6,
    fontSize: 11,
  },
  funCard: { minHeight: 65, paddingTop: 4 },
  funPrompt: { marginTop: 5, fontSize: 10.5, lineHeight: 1.45 },
  wordCard: { minHeight: 76, paddingTop: 4, borderBottomWidth: 0.5, borderBottomColor: '#dddddd' },
  wordPrompt: { marginTop: 3, fontSize: 10, lineHeight: 1.45 },
  writingRow: { marginTop: 8, flexDirection: 'row', fontSize: 8.5 },
  writingBlank: { flexGrow: 1, marginLeft: 5, marginRight: 12, borderBottomWidth: 0.7, borderBottomColor: '#555555' },
  logicCell: { width: '50%', paddingRight: 10, paddingTop: 3 },
  logicLabel: { marginBottom: 4, fontSize: 8.5, fontWeight: 700 },
  sudoku: { width: 84, height: 84, borderWidth: 1.4, borderColor: '#222222' },
  sudokuRow: { width: '100%', height: '25%', flexDirection: 'row' },
  sudokuCell: {
    width: '25%',
    height: '100%',
    borderWidth: 0.35,
    borderColor: '#888888',
    textAlign: 'center',
    paddingTop: 4.5,
    fontSize: 9,
  },
  sudokuStrongRight: { borderRightWidth: 1.1, borderRightColor: '#222222' },
  sudokuStrongBottom: { borderBottomWidth: 1.1, borderBottomColor: '#222222' },
  pyramid: { width: 115, alignItems: 'center', paddingTop: 2 },
  pyramidRow: { flexDirection: 'row', justifyContent: 'center' },
  pyramidCell: {
    width: 30,
    height: 25,
    margin: 1.5,
    borderWidth: 0.7,
    borderColor: '#555555',
    textAlign: 'center',
    paddingTop: 5.5,
    fontSize: 9,
  },
  clue: { fontSize: 9, lineHeight: 1.45, marginBottom: 8 },
  clueLine: { width: '100%', marginTop: 8, borderBottomWidth: 0.7, borderBottomColor: '#555555' },
  answers: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4 },
  answerItem: {
    width: '33.333%',
    minHeight: 24,
    paddingTop: 4,
    paddingRight: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: '#e0e0e0',
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    top: 800,
    left: 30,
    right: 30,
    height: 22,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#777777',
    fontSize: 7.5,
  },
});

function SudokuGrid({ question, reveal }: { question: SudokuQuestion; reveal: boolean }) {
  const grid = reveal ? question.solution : question.puzzle;
  return (
    <View style={styles.sudoku}>
      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.sudokuRow}>
          {row.map((value, columnIndex) => (
            <Text
              key={`${rowIndex}-${columnIndex}`}
              style={[
                styles.sudokuCell,
                columnIndex === 1 ? styles.sudokuStrongRight : {},
                rowIndex === 1 ? styles.sudokuStrongBottom : {},
              ]}
            >
              {value === 0 ? '' : value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Pyramid({ question, reveal }: { question: PyramidQuestion; reveal: boolean }) {
  const value = (index: number) => reveal || !question.hiddenIndices.includes(index) ? question.values[index] : '';
  return (
    <View style={styles.pyramid}>
      <View style={styles.pyramidRow}><Text style={styles.pyramidCell}>{value(5)}</Text></View>
      <View style={styles.pyramidRow}><Text style={styles.pyramidCell}>{value(3)}</Text><Text style={styles.pyramidCell}>{value(4)}</Text></View>
      <View style={styles.pyramidRow}><Text style={styles.pyramidCell}>{value(0)}</Text><Text style={styles.pyramidCell}>{value(1)}</Text><Text style={styles.pyramidCell}>{value(2)}</Text></View>
    </View>
  );
}

function WorksheetQuestions({ questions, start }: { questions: MathQuestion[]; start: number }) {
  const first = questions[0];
  if (!first) return null;

  if (first.kind === 'arithmetic') {
    return <View style={styles.grid}>{questions.map((question, index) => question.kind === 'arithmetic' && (
      <View key={index} style={styles.thirdCell}><View style={styles.equationRow}><Text style={styles.equation}>{question.prompt}</Text></View></View>
    ))}</View>;
  }

  if (first.kind === 'make_break_ten') {
    return <View style={styles.grid}>{questions.map((question, index) => question.kind === 'make_break_ten' && (
      <View key={index} style={styles.halfCell}><View style={styles.methodCard}><View style={styles.methodTop}><Text style={styles.methodPrompt}>{question.prompt} ____</Text><Text style={styles.methodLabel}>{question.method}</Text></View><Text style={styles.methodStep}>{question.stepHint}</Text></View></View>
    ))}</View>;
  }

  if (first.kind === 'number_patterns') {
    return <View>{questions.map((question, index) => question.kind === 'number_patterns' && (
      <View key={index} style={styles.patternCard}><Text>{start + index + 1}. 找规律，把空格补完整。</Text><View style={styles.patternRow}>{question.cells.map((value, cellIndex) => <Text key={cellIndex} style={styles.patternCell}>{value ?? ''}</Text>)}</View></View>
    ))}</View>;
  }

  if (first.kind === 'number_fun') {
    return <View style={styles.grid}>{questions.map((question, index) => question.kind === 'number_fun' && (
      <View key={index} style={styles.halfCell}><View style={styles.funCard}><Text>{start + index + 1}.</Text><Text style={styles.funPrompt}>{question.prompt}</Text></View></View>
    ))}</View>;
  }

  if (first.kind === 'word_problems') {
    return <View>{questions.map((question, index) => question.kind === 'word_problems' && (
      <View key={index} style={styles.wordCard}><Text style={styles.wordPrompt}>{start + index + 1}. {question.prompt}</Text><View style={styles.writingRow}><Text>算式：</Text><View style={styles.writingBlank} /><Text>答：</Text><View style={styles.writingBlank} /></View></View>
    ))}</View>;
  }

  return <View style={styles.grid}>{questions.map((question, index) => (
    <View key={index} style={styles.logicCell}>
      {question.kind === 'sudoku' && <><Text style={styles.logicLabel}>{start + index + 1}. 4×4 数独</Text><SudokuGrid question={question} reveal={false} /></>}
      {question.kind === 'pyramid' && <><Text style={styles.logicLabel}>{start + index + 1}. 数字金字塔</Text><Pyramid question={question} reveal={false} /></>}
      {question.kind === 'logic_clue' && <><Text style={styles.logicLabel}>{start + index + 1}. 猜数字</Text><Text style={styles.clue}>{question.prompt}</Text><View style={styles.clueLine} /></>}
    </View>
  ))}</View>;
}

function AnswerQuestions({ questions, start }: { questions: MathQuestion[]; start: number }) {
  return (
    <View style={styles.answers}>
      {questions.map((question, index) => {
        if (question.kind === 'arithmetic' || question.kind === 'make_break_ten') {
          return <Text key={index} style={styles.answerItem}>{question.prompt} {question.answer}</Text>;
        }
        if (question.kind === 'sudoku') {
          return <View key={index} style={styles.logicCell}><Text style={styles.logicLabel}>{start + index + 1}. 数独答案</Text><SudokuGrid question={question} reveal /></View>;
        }
        if (question.kind === 'pyramid') {
          return <View key={index} style={styles.logicCell}><Text style={styles.logicLabel}>{start + index + 1}. 金字塔答案</Text><Pyramid question={question} reveal /></View>;
        }
        return <Text key={index} style={styles.answerItem}>{start + index + 1}）{question.answer}</Text>;
      })}
    </View>
  );
}

function TopicSection({ worksheet, placement, documentType }: { worksheet: MathWorksheet; placement: TopicPlacement; documentType: DocumentType }) {
  const questions = worksheet.questions[placement.topic].slice(
    placement.questionStart,
    placement.questionStart + placement.questionCount,
  );
  const continued = placement.segmentIndex > 0;
  return (
    <View style={[styles.section, { height: placement.unitCount * UNIT_HEIGHT }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{placement.topicIndex + 1}. {mathTopicLabels[placement.topic]}{continued ? '（续）' : ''}</Text>
        <Text style={styles.sectionHint}>{documentType === 'worksheet' ? '请认真读题，并把答案写在空白处' : '仅供家长核对最终答案'}</Text>
      </View>
      {documentType === 'worksheet'
        ? <WorksheetQuestions questions={questions} start={placement.questionStart} />
        : <AnswerQuestions questions={questions} start={placement.questionStart} />}
    </View>
  );
}

export function MathPdfDocument({ worksheet, documentType }: { worksheet: MathWorksheet; documentType: DocumentType }) {
  const title = documentType === 'worksheet' ? '幼儿园数学练习' : '幼儿园数学练习答案';
  return (
    <Document title={`${title}-${worksheet.seed}`} author="Home Assistant">
      {Array.from({ length: worksheet.pageCount }, (_, pageIndex) => {
        const placements = worksheet.placements.filter((placement) => placement.pageIndex === pageIndex);
        return (
          <Page key={pageIndex} size="A4" style={styles.page} wrap={false}>
            <View style={styles.pageFrame} />
            <View style={styles.header}>
              <View><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerMeta}>批次码：{worksheet.seed} · 5-6 岁幼小衔接</Text></View>
              <View style={styles.identity}><Text style={styles.identityLine}>姓名：________________</Text><Text style={styles.identityLine}>日期：________________</Text></View>
            </View>
            <View style={styles.content}>{placements.map((placement) => <TopicSection key={`${placement.topic}-${placement.segmentIndex}`} worksheet={worksheet} placement={placement} documentType={documentType} />)}</View>
            <View style={styles.footer}><Text>Home Assistant · 黑白省墨练习</Text><Text>第 {pageIndex + 1} / {worksheet.pageCount} 页</Text></View>
          </Page>
        );
      })}
    </Document>
  );
}
