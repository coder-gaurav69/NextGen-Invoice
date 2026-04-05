/**
 * Capitalize text - converts to Proper Case (Title Case)
 * Example: "paracetamol tablet" → "Paracetamol Tablet"
 */
export function capitalizeText(text) {
  // Handle null, undefined, empty string
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format number - remove trailing zeros but preserve meaningful decimals
 * Examples:
 * - 52.000 → "52"
 * - 52.50 → "52.50"
 * - 472.05 → "472.05"
 * - null/undefined → "0"
 */
export function formatNumber(number) {
  // Handle null, undefined, NaN
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  // Convert to number if string
  const num = typeof number === 'string' ? parseFloat(number) : number;

  // If not a valid number, return 0
  if (isNaN(num)) {
    return '0';
  }

  // Convert to string with up to 10 decimal places to preserve precision
  const str = num.toFixed(10);

  // Remove trailing zeros after decimal point
  const trimmed = str.replace(/\.?0+$/, '');

  return trimmed;
}

/**
 * Calculate total and format it
 * Calculation is done with full precision, formatting applied only for display
 */
export function calculateAndFormatTotal(rate, quantity) {
  // Handle invalid inputs
  const r = parseFloat(rate) || 0;
  const q = parseFloat(quantity) || 0;

  // Calculate with full precision
  const total = r * q;

  // Format only for display
  return formatNumber(total);
}
