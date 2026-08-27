import type { MathTopic, TopicPlacement } from './types';

export const UNITS_PER_PAGE = 6;
export const MINIMUM_UNITS_PER_TOPIC = 2;
export const MAXIMUM_PAGE_COUNT = 12;

export function minimumPageCount(topicCount: number) {
  return Math.max(1, Math.ceil((topicCount * MINIMUM_UNITS_PER_TOPIC) / UNITS_PER_PAGE));
}

export function allocateTopicUnits(topics: MathTopic[], pageCount: number) {
  if (topics.length === 0) return [];
  const totalUnits = pageCount * UNITS_PER_PAGE;
  const minimumUnits = topics.length * MINIMUM_UNITS_PER_TOPIC;
  if (totalUnits < minimumUnits) throw new Error('Page count is too small for selected topics');

  const remaining = totalUnits - minimumUnits;
  const extraPerTopic = Math.floor(remaining / topics.length);
  const remainder = remaining % topics.length;
  return topics.map((topic, index) => ({
    topic,
    topicIndex: index,
    unitCount: MINIMUM_UNITS_PER_TOPIC + extraPerTopic + (index < remainder ? 1 : 0),
  }));
}

const PDF_UNIT_HEIGHT = 120;
const PDF_SECTION_CHROME_HEIGHT = 31;
const ARITHMETIC_ROW_HEIGHT = 40;

function segmentQuestionCapacity(topic: MathTopic, units: number) {
  switch (topic) {
    case 'arithmetic': return Math.max(1, Math.floor(((units * PDF_UNIT_HEIGHT) - PDF_SECTION_CHROME_HEIGHT) / ARITHMETIC_ROW_HEIGHT)) * 3;
    case 'make_break_ten': return units * 2;
    case 'number_patterns': return units;
    case 'number_fun': return units * 2;
    case 'word_problems': return units;
    case 'logic_puzzles': return units;
  }
}

function maximumUniqueQuestionCount(topic: MathTopic) {
  if (topic === 'arithmetic') return 132;
  if (topic === 'make_break_ten') return 72;
  return Number.POSITIVE_INFINITY;
}

export function planTopicPlacements(topics: MathTopic[], pageCount: number): TopicPlacement[] {
  const allocations = allocateTopicUnits(topics, pageCount);
  const result: TopicPlacement[] = [];
  let pageIndex = 0;
  let startUnit = 0;

  for (const allocation of allocations) {
    let unitsRemaining = allocation.unitCount;
    const segments: Array<{ pageIndex: number; startUnit: number; unitCount: number }> = [];
    while (unitsRemaining > 0) {
      const available = UNITS_PER_PAGE - startUnit;
      const unitCount = Math.min(available, unitsRemaining);
      segments.push({ pageIndex, startUnit, unitCount });
      unitsRemaining -= unitCount;
      startUnit += unitCount;
      if (startUnit === UNITS_PER_PAGE) {
        pageIndex += 1;
        startUnit = 0;
      }
    }

    const segmentCapacities = segments.map((segment) => segmentQuestionCapacity(allocation.topic, segment.unitCount));
    const totalCapacity = segmentCapacities.reduce((sum, capacity) => sum + capacity, 0);
    const totalQuestions = Math.min(totalCapacity, maximumUniqueQuestionCount(allocation.topic));
    let questionsRemaining = totalQuestions;
    let capacityRemaining = totalCapacity;
    let questionStart = 0;
    segments.forEach((segment, segmentIndex) => {
      const segmentCapacity = segmentCapacities[segmentIndex] ?? 0;
      const questionCount = segmentIndex === segments.length - 1
        ? questionsRemaining
        : Math.min(segmentCapacity, Math.max(1, Math.round((questionsRemaining * segmentCapacity) / capacityRemaining)));
      result.push({
        topic: allocation.topic,
        topicIndex: allocation.topicIndex,
        ...segment,
        segmentIndex,
        segmentCount: segments.length,
        questionStart,
        questionCount,
      });
      questionStart += questionCount;
      questionsRemaining -= questionCount;
      capacityRemaining -= segmentCapacity;
    });
  }

  return result;
}
