import { describe, expect, it } from 'vitest';
import { countPyramidSolutions, countSudokuSolutions, createMathWorksheet } from './generator';
import { allocateTopicUnits, minimumPageCount, planTopicPlacements } from './layout';
import { mathTopics } from './types';

describe('math printable layout', () => {
  it('assigns one third of a page to each of six topics across two pages', () => {
    expect(minimumPageCount(mathTopics.length)).toBe(2);
    expect(allocateTopicUnits([...mathTopics], 2).map(({ unitCount }) => unitCount)).toEqual([2, 2, 2, 2, 2, 2]);
    const placements = planTopicPlacements([...mathTopics], 2);
    expect(placements.map(({ pageIndex, startUnit, unitCount }) => [pageIndex, startUnit, unitCount])).toEqual([
      [0, 0, 2], [0, 2, 2], [0, 4, 2],
      [1, 0, 2], [1, 2, 2], [1, 4, 2],
    ]);
    expect(placements.find(({ topic }) => topic === 'arithmetic')?.questionCount).toBe(15);
  });

  it('shares extra height evenly in fixed topic order', () => {
    expect(allocateTopicUnits([...mathTopics], 3).map(({ unitCount }) => unitCount)).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it('marks a topic that continues on the next page', () => {
    const placements = planTopicPlacements(['arithmetic', 'number_patterns', 'word_problems'], 2);
    const middleTopic = placements.filter(({ topic }) => topic === 'number_patterns');
    expect(middleTopic.map(({ pageIndex, unitCount, segmentIndex }) => [pageIndex, unitCount, segmentIndex])).toEqual([
      [0, 2, 0],
      [1, 2, 1],
    ]);
  });
});

describe('math printable generation', () => {
  it('is deterministic for the same batch and configuration', () => {
    const first = createMathWorksheet('ABCDEFGH2345', [...mathTopics], 2);
    const second = createMathWorksheet('ABCDEFGH2345', [...mathTopics], 2);
    expect(second).toEqual(first);
    expect(createMathWorksheet('ABCDEFGH2346', [...mathTopics], 2)).not.toEqual(first);
  });

  it('creates unique arithmetic without negative answers or totals over ten', () => {
    const worksheet = createMathWorksheet('ARITHMETIC23', ['arithmetic'], 4);
    const questions = worksheet.questions.arithmetic;
    expect(new Set(questions.map((question) => question.kind === 'arithmetic' ? question.prompt : '')).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.kind).toBe('arithmetic');
      if (question.kind === 'arithmetic') expect(Number(question.answer)).toBeGreaterThanOrEqual(0);
      if (question.kind === 'arithmetic') expect(Number(question.answer)).toBeLessThanOrEqual(10);
    }
  });

  it('creates cross-ten questions and bounded story answers', () => {
    const worksheet = createMathWorksheet('CROSSTEN2345', ['make_break_ten', 'word_problems'], 2);
    expect(worksheet.questions.make_break_ten.every((question) => question.kind === 'make_break_ten' && Number(question.answer) >= 2 && Number(question.answer) <= 18)).toBe(true);
    expect(worksheet.questions.word_problems.every((question) => question.kind === 'word_problems' && Number.parseInt(question.answer, 10) <= 10)).toBe(true);
  });

  it('generates a uniquely solvable 4 by 4 sudoku and another number puzzle', () => {
    const worksheet = createMathWorksheet('SUDOKU234567', ['logic_puzzles'], 1);
    const sudoku = worksheet.questions.logic_puzzles.find((question) => question.kind === 'sudoku');
    expect(sudoku?.kind).toBe('sudoku');
    if (sudoku?.kind === 'sudoku') expect(countSudokuSolutions(sudoku.puzzle)).toBe(1);
    const pyramid = worksheet.questions.logic_puzzles.find((question) => question.kind === 'pyramid');
    expect(pyramid?.kind).toBe('pyramid');
    if (pyramid?.kind === 'pyramid') {
      expect(pyramid.hiddenIndices).toHaveLength(3);
      expect(pyramid.hiddenIndices.filter((index) => index <= 2)).toHaveLength(1);
      expect(pyramid.hiddenIndices.filter((index) => index >= 3 && index <= 4)).toHaveLength(1);
      expect(pyramid.hiddenIndices).toContain(5);
      expect(countPyramidSolutions(pyramid)).toBe(1);
    }
  });
});
