export function splitCommaSeparatedValues(value = '') {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
