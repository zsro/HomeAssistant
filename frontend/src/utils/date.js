function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isToday(dateString) {
  return dateString === formatLocalDate();
}
