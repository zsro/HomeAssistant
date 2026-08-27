import { planTopicPlacements } from './layout';
import { createRandom, type RandomSource } from './random';
import type {
  ArithmeticQuestion,
  LogicClueQuestion,
  MakeBreakTenQuestion,
  MathQuestion,
  MathTopic,
  MathWorksheet,
  NumberFunQuestion,
  PatternQuestion,
  PyramidQuestion,
  SudokuQuestion,
  WordProblemQuestion,
} from './types';

function createArithmeticQuestions(random: RandomSource, count: number): ArithmeticQuestion[] {
  const pool: ArithmeticQuestion[] = [];
  for (let left = 0; left <= 10; left += 1) {
    for (let right = 0; right <= 10 - left; right += 1) {
      pool.push({ kind: 'arithmetic', prompt: `${left} + ${right} =`, answer: String(left + right) });
    }
  }
  for (let left = 0; left <= 10; left += 1) {
    for (let right = 0; right <= left; right += 1) {
      pool.push({ kind: 'arithmetic', prompt: `${left} - ${right} =`, answer: String(left - right) });
    }
  }
  return random.shuffle(pool).slice(0, count);
}

function createMakeBreakTenQuestions(random: RandomSource, count: number): MakeBreakTenQuestion[] {
  const pool: MakeBreakTenQuestion[] = [];
  for (let left = 2; left <= 9; left += 1) {
    for (let right = 2; right <= 9; right += 1) {
      const answer = left + right;
      if (answer > 10 && answer <= 18) {
        pool.push({
          kind: 'make_break_ten',
          prompt: `${left} + ${right} =`,
          method: '凑十法',
          stepHint: `${right} 可以分成 ____ 和 ____`,
          answer: String(answer),
        });
      }
    }
  }
  for (let left = 11; left <= 18; left += 1) {
    for (let right = 2; right <= 9; right += 1) {
      const answer = left - right;
      if (answer >= 2 && answer < 10) {
        pool.push({
          kind: 'make_break_ten',
          prompt: `${left} - ${right} =`,
          method: '破十法',
          stepHint: `${left} 可以分成 10 和 ____`,
          answer: String(answer),
        });
      }
    }
  }
  return random.shuffle(pool).slice(0, count);
}

function createPatternQuestions(random: RandomSource, count: number): PatternQuestion[] {
  return Array.from({ length: count }, () => {
    const step = random.int(1, 3);
    const ascending = random.next() >= 0.35;
    const start = ascending ? random.int(0, 20 - step * 5) : random.int(step * 5, 20);
    const values = Array.from({ length: 6 }, (_, index) => start + (ascending ? 1 : -1) * step * index);
    const hiddenIndices = random.shuffle([1, 2, 3, 4]).slice(0, random.int(2, 3));
    const cells = values.map((value, index) => hiddenIndices.includes(index) ? null : value);
    return {
      kind: 'number_patterns',
      cells,
      answer: hiddenIndices.sort((left, right) => left - right).map((index) => values[index]).join('、'),
    };
  });
}

function createNumberFunQuestions(random: RandomSource, count: number): NumberFunQuestion[] {
  const modes: NumberFunQuestion['mode'][] = ['decompose', 'compare', 'quantity'];
  return Array.from({ length: count }, (_, index) => {
    const mode = modes[index % modes.length] as NumberFunQuestion['mode'];
    if (mode === 'decompose') {
      const total = random.int(5, 10);
      const known = random.int(1, total - 1);
      return { kind: 'number_fun', mode, prompt: `${total} 可以分成 ${known} 和 ____`, answer: String(total - known) };
    }
    if (mode === 'compare') {
      const left = random.int(0, 10);
      let right = random.int(0, 10);
      if (right === left && random.next() > 0.45) right = (right + 1) % 11;
      const answer = left === right ? '=' : left > right ? '>' : '<';
      return { kind: 'number_fun', mode, prompt: `${left}  ○  ${right}（填 >、< 或 =）`, answer };
    }
    const groups = random.shuffle([
      { symbol: '●', count: random.int(3, 8) },
      { symbol: '▲', count: random.int(3, 8) },
    ]);
    const first = groups[0] as { symbol: string; count: number };
    const second = groups[1] as { symbol: string; count: number };
    return {
      kind: 'number_fun',
      mode,
      prompt: `${first.symbol.repeat(first.count)}  和  ${second.symbol.repeat(second.count)}  哪组更多？`,
      answer: first.count === second.count ? '一样多' : first.count > second.count ? first.symbol : second.symbol,
    };
  });
}

const wordItems = ['苹果', '积木', '小鱼', '气球', '彩笔', '贴纸'] as const;
const names = ['乐乐', '朵朵', '安安', '小雨', '米粒', '可可'] as const;

function createWordProblemQuestions(random: RandomSource, count: number): WordProblemQuestion[] {
  return Array.from({ length: count }, () => {
    const add = random.next() >= 0.45;
    const item = random.pick(wordItems);
    const name = random.pick(names);
    if (add) {
      const first = random.int(1, 7);
      const second = random.int(1, 10 - first);
      return {
        kind: 'word_problems',
        prompt: `${name}有 ${first} 个${item}，又得到 ${second} 个。现在一共有多少个${item}？`,
        equation: `${first} + ${second} = ${first + second}`,
        answer: `${first + second} 个`,
      };
    }
    const total = random.int(4, 10);
    const removed = random.int(1, total - 1);
    return {
      kind: 'word_problems',
      prompt: `${name}原来有 ${total} 个${item}，送给朋友 ${removed} 个。还剩多少个${item}？`,
      equation: `${total} - ${removed} = ${total - removed}`,
      answer: `${total - removed} 个`,
    };
  });
}

function shuffledSudokuSolution(random: RandomSource) {
  const base = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];
  const symbols = random.shuffle([1, 2, 3, 4]);
  const rowBands = random.shuffle([[0, 1], [2, 3]]).flatMap((band) => random.shuffle(band));
  const columnBands = random.shuffle([[0, 1], [2, 3]]).flatMap((band) => random.shuffle(band));
  return rowBands.map((row) => columnBands.map((column) => symbols[(base[row] as number[])[column]! - 1]!));
}

export function countSudokuSolutions(input: number[][], limit = 2): number {
  const grid = input.map((row) => [...row]);
  let solutions = 0;

  const solve = () => {
    if (solutions >= limit) return;
    let targetRow = -1;
    let targetColumn = -1;
    let candidates: number[] = [];

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        if (grid[row]?.[column] !== 0) continue;
        const possible = [1, 2, 3, 4].filter((value) => {
          if (grid[row]?.includes(value)) return false;
          if (grid.some((currentRow) => currentRow[column] === value)) return false;
          const rowStart = Math.floor(row / 2) * 2;
          const columnStart = Math.floor(column / 2) * 2;
          for (let boxRow = rowStart; boxRow < rowStart + 2; boxRow += 1) {
            for (let boxColumn = columnStart; boxColumn < columnStart + 2; boxColumn += 1) {
              if (grid[boxRow]?.[boxColumn] === value) return false;
            }
          }
          return true;
        });
        if (possible.length === 0) return;
        if (targetRow === -1 || possible.length < candidates.length) {
          targetRow = row;
          targetColumn = column;
          candidates = possible;
        }
      }
    }

    if (targetRow === -1) {
      solutions += 1;
      return;
    }
    for (const value of candidates) {
      const target = grid[targetRow];
      if (!target) continue;
      target[targetColumn] = value;
      solve();
      target[targetColumn] = 0;
    }
  };

  solve();
  return solutions;
}

function createSudokuQuestion(random: RandomSource): SudokuQuestion {
  const solution = shuffledSudokuSolution(random);
  const puzzle = solution.map((row) => [...row]);
  const positions = random.shuffle(Array.from({ length: 16 }, (_, index) => index));
  let removed = 0;
  for (const position of positions) {
    if (removed >= 9) break;
    const row = Math.floor(position / 4);
    const column = position % 4;
    const currentRow = puzzle[row];
    if (!currentRow) continue;
    const previous = currentRow[column];
    currentRow[column] = 0;
    if (countSudokuSolutions(puzzle) === 1) removed += 1;
    else currentRow[column] = previous ?? 0;
  }
  return { kind: 'sudoku', puzzle, solution, answer: solution.map((row) => row.join(' ')).join(' / ') };
}

function createPyramidQuestion(random: RandomSource): PyramidQuestion {
  const bottomLeft = random.int(1, 4);
  const bottomMiddle = random.int(1, 4);
  const bottomRight = random.int(1, 4);
  const values: PyramidQuestion['values'] = [
    bottomLeft,
    bottomMiddle,
    bottomRight,
    bottomLeft + bottomMiddle,
    bottomMiddle + bottomRight,
    bottomLeft + bottomMiddle * 2 + bottomRight,
  ];
  const [bottomIndex, middleIndex] = random.pick([
    [1, 3],
    [2, 3],
    [0, 4],
    [1, 4],
  ] as const);
  const hiddenIndices: PyramidQuestion['hiddenIndices'] = [bottomIndex, middleIndex, 5];
  return {
    kind: 'pyramid',
    values,
    hiddenIndices,
    answer: hiddenIndices.map((index) => values[index]).join('、'),
  };
}

export function countPyramidSolutions(question: PyramidQuestion): number {
  let solutions = 0;
  for (let left = 1; left <= 4; left += 1) {
    for (let middle = 1; middle <= 4; middle += 1) {
      for (let right = 1; right <= 4; right += 1) {
        const candidate = [left, middle, right, left + middle, middle + right, left + (middle * 2) + right];
        const matchesVisibleCells = candidate.every((value, index) => (
          question.hiddenIndices.includes(index) || value === question.values[index]
        ));
        if (matchesVisibleCells) solutions += 1;
      }
    }
  }
  return solutions;
}

function createLogicClueQuestion(random: RandomSource): LogicClueQuestion {
  const start = random.int(2, 7);
  const end = start + 3;
  const excluded = random.pick([start + 1, start + 2]);
  const answer = excluded === start + 1 ? start + 2 : start + 1;
  return {
    kind: 'logic_clue',
    prompt: `小熊的数字比 ${start} 大，比 ${end} 小，而且不是 ${excluded}。它是几？`,
    answer: String(answer),
  };
}

function createLogicQuestions(random: RandomSource, count: number): MathQuestion[] {
  const types = random.shuffle(['sudoku', 'pyramid'] as const);
  return Array.from({ length: count }, (_, index) => {
    const type = index < 2 ? types[index] : random.pick(['sudoku', 'pyramid', 'clue'] as const);
    if (type === 'sudoku') return createSudokuQuestion(random);
    if (type === 'pyramid') return createPyramidQuestion(random);
    return createLogicClueQuestion(random);
  });
}

function generateQuestions(topic: MathTopic, random: RandomSource, count: number): MathQuestion[] {
  switch (topic) {
    case 'arithmetic': return createArithmeticQuestions(random, count);
    case 'make_break_ten': return createMakeBreakTenQuestions(random, count);
    case 'number_patterns': return createPatternQuestions(random, count);
    case 'number_fun': return createNumberFunQuestions(random, count);
    case 'word_problems': return createWordProblemQuestions(random, count);
    case 'logic_puzzles': return createLogicQuestions(random, count);
  }
}

export function createMathWorksheet(seed: string, topics: MathTopic[], pageCount: number): MathWorksheet {
  const placements = planTopicPlacements(topics, pageCount);
  const questions: Record<MathTopic, MathQuestion[]> = {
    arithmetic: [],
    make_break_ten: [],
    number_patterns: [],
    number_fun: [],
    word_problems: [],
    logic_puzzles: [],
  };
  for (const topic of topics) {
    const count = placements
      .filter((placement) => placement.topic === topic)
      .reduce((sum, placement) => sum + placement.questionCount, 0);
    questions[topic] = generateQuestions(topic, createRandom(`${seed}:${topic}`), count);
  }
  return { seed, topics: [...topics], pageCount, questions, placements };
}
