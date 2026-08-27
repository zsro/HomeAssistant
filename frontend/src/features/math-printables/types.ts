export const mathTopics = [
  'arithmetic',
  'make_break_ten',
  'number_patterns',
  'number_fun',
  'word_problems',
  'logic_puzzles',
] as const;

export type MathTopic = (typeof mathTopics)[number];
export type DocumentType = 'worksheet' | 'answers';

export const mathTopicLabels: Record<MathTopic, string> = {
  arithmetic: '算数',
  make_break_ten: '破十法与凑十法',
  number_patterns: '数字找规律',
  number_fun: '数字趣味',
  word_problems: '应用题',
  logic_puzzles: '兴趣题',
};

export const mathTopicDescriptions: Record<MathTopic, string> = {
  arithmetic: '10 以内加减法',
  make_break_ten: '20 以内跨十计算',
  number_patterns: '观察并填写数字序列',
  number_fun: '数字分解、比较和数量',
  word_problems: '生活场景中的加减法',
  logic_puzzles: '4×4 数独与数字逻辑',
};

export type ArithmeticQuestion = {
  kind: 'arithmetic';
  prompt: string;
  answer: string;
};

export type MakeBreakTenQuestion = {
  kind: 'make_break_ten';
  prompt: string;
  method: '凑十法' | '破十法';
  stepHint: string;
  answer: string;
};

export type PatternQuestion = {
  kind: 'number_patterns';
  cells: Array<number | null>;
  answer: string;
};

export type NumberFunQuestion = {
  kind: 'number_fun';
  mode: 'decompose' | 'compare' | 'quantity';
  prompt: string;
  answer: string;
};

export type WordProblemQuestion = {
  kind: 'word_problems';
  prompt: string;
  equation: string;
  answer: string;
};

export type SudokuQuestion = {
  kind: 'sudoku';
  puzzle: number[][];
  solution: number[][];
  answer: string;
};

export type PyramidQuestion = {
  kind: 'pyramid';
  values: [number, number, number, number, number, number];
  hiddenIndices: [number, number, number];
  answer: string;
};

export type LogicClueQuestion = {
  kind: 'logic_clue';
  prompt: string;
  answer: string;
};

export type MathQuestion =
  | ArithmeticQuestion
  | MakeBreakTenQuestion
  | PatternQuestion
  | NumberFunQuestion
  | WordProblemQuestion
  | SudokuQuestion
  | PyramidQuestion
  | LogicClueQuestion;

export type TopicPlacement = {
  topic: MathTopic;
  topicIndex: number;
  pageIndex: number;
  startUnit: number;
  unitCount: number;
  segmentIndex: number;
  segmentCount: number;
  questionStart: number;
  questionCount: number;
};

export type MathWorksheet = {
  seed: string;
  pageCount: number;
  topics: MathTopic[];
  questions: Record<MathTopic, MathQuestion[]>;
  placements: TopicPlacement[];
};
