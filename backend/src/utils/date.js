function pad(value) {
  return String(value).padStart(2, '0');
}

function createLocalDate(year, month, day) {
  return new Date(year, month - 1, day);
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return createLocalDate(year, month, day);
}

function toDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addDaysToDateString(dateString, days) {
  return toDateString(addDays(parseDateString(dateString), days));
}

function getTodayString() {
  return toDateString();
}

function getYesterdayString() {
  return addDaysToDateString(getTodayString(), -1);
}

function getWeekStart(date = new Date()) {
  const currentDate = date instanceof Date ? new Date(date) : new Date(date);
  const day = currentDate.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return toDateString(addDays(currentDate, offset));
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(weekStart, index));
}

function getWeekdayIndex(date = new Date()) {
  const day = (date instanceof Date ? date : new Date(date)).getDay();
  return day === 0 ? 6 : day - 1;
}

function getMonthRange(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    daysInMonth,
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(daysInMonth)}`,
  };
}

function calculateConsecutiveDays(dates) {
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) {
    return 0;
  }

  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  let consecutive = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const expectedPreviousDate = addDaysToDateString(uniqueDates[index - 1], -1);
    if (uniqueDates[index] === expectedPreviousDate) {
      consecutive += 1;
      continue;
    }
    break;
  }

  return consecutive;
}

module.exports = {
  addDays,
  addDaysToDateString,
  calculateConsecutiveDays,
  getMonthRange,
  getTodayString,
  getWeekDates,
  getWeekStart,
  getWeekdayIndex,
  getYesterdayString,
  parseDateString,
  toDateString,
};
