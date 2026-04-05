const NUMERIC_TEXT_REGEX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function isNumericText(value) {
  return NUMERIC_TEXT_REGEX.test(value.trim());
}

function getFractionLength(value) {
  const text = String(value ?? '').trim();
  if (!text || !isNumericText(text)) return 0;
  const dotIndex = text.indexOf('.');
  if (dotIndex === -1) return 0;
  return text.length - dotIndex - 1;
}

function trimNumericString(value) {
  if (!value.includes('.')) return value;
  return value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

/**
 * Convert user text input to uppercase.
 */
export function uppercase(text) {
  if (text === null || text === undefined) return '';
  return String(text).toUpperCase();
}

/**
 * Backward-compatible alias for existing imports.
 */
export const capitalizeText = uppercase;

/**
 * Format numbers for display.
 * - "52.000" => "52"
 * - "52.50" => "52.50"
 * - 472.05 => "472.05"
 * - null/invalid => "0"
 */
export function formatNumber(input) {
  if (input === null || input === undefined) return '0';

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return '0';
    if (!isNumericText(text)) return '0';

    const numeric = Number(text);
    if (!Number.isFinite(numeric)) return '0';

    const unsignedText = text.replace(/^[+-]/, '');
    const sign = numeric < 0 ? '-' : '';

    if (!unsignedText.includes('.')) {
      return `${sign}${String(Math.abs(numeric))}`;
    }

    const [integerRaw = '0', fractionRaw = ''] = unsignedText.split('.');
    const integerPart = String(Number(integerRaw || '0'));

    if (!fractionRaw || /^0+$/.test(fractionRaw)) {
      return `${sign}${integerPart}`;
    }

    return `${sign}${integerPart}.${fractionRaw}`;
  }

  const numeric = Number(input);
  if (!Number.isFinite(numeric)) return '0';
  if (Object.is(numeric, -0) || numeric === 0) return '0';

  const normalized = Number(numeric.toPrecision(15));
  const asText = String(normalized);
  if (!/[eE]/.test(asText)) {
    return trimNumericString(asText);
  }

  return trimNumericString(normalized.toFixed(12));
}

/**
 * Calculate total and format for display without mutating raw input values.
 */
export function calculateAndFormatTotal(rate, quantity) {
  const rateText = String(rate ?? '').trim();
  const qtyText = String(quantity ?? '').trim();

  const rateValue = Number(rateText);
  const qtyValue = Number(qtyText);

  if (!Number.isFinite(rateValue) || !Number.isFinite(qtyValue)) {
    return '0';
  }

  const total = rateValue * qtyValue;
  const scale = Math.min(10, getFractionLength(rateText) + getFractionLength(qtyText));

  if (scale <= 0) {
    return formatNumber(total);
  }

  return formatNumber(total.toFixed(scale));
}
