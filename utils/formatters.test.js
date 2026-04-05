/**
 * TEST CASES for formatters
 * Run these to verify functions work correctly
 */

import { uppercase, formatNumber, calculateAndFormatTotal } from '../utils/formatters.js';

console.log('=== TEXT UPPERCASE TESTS ===');
console.log(uppercase('paracetamol tablet')); // "PARACETAMOL TABLET"
console.log(uppercase('Aspirin tablets')); // "ASPIRIN TABLETS"
console.log(uppercase('ibuprofen')); // "IBUPROFEN"
console.log(uppercase('')); // ""
console.log(uppercase(null)); // ""

console.log('\n=== NUMBER FORMATTING TESTS ===');
console.log(formatNumber(52.000)); // "52"
console.log(formatNumber('52.50')); // "52.50"
console.log(formatNumber(472.05)); // "472.05"
console.log(formatNumber(100.00)); // "100"
console.log(formatNumber(1000)); // "1000"
console.log(formatNumber('52.000')); // "52"
console.log(formatNumber(null)); // "0"
console.log(formatNumber(undefined)); // "0"
console.log(formatNumber(NaN)); // "0"
console.log(formatNumber('')); // "0"
console.log(formatNumber('abc')); // "0"

console.log('\n=== CALCULATION TESTS ===');
console.log(calculateAndFormatTotal('52.50', '9')); // "472.50"
console.log(calculateAndFormatTotal(100, 5)); // "500"
console.log(calculateAndFormatTotal('45.75', '2')); // "91.50"
console.log(calculateAndFormatTotal(10, 3.5)); // "35"
console.log(calculateAndFormatTotal(null, null)); // "0"

/**
 * EDGE CASES
 */
console.log('\n=== EDGE CASES ===');
console.log(formatNumber(0.1 + 0.2)); // Floating point: "0.3"
console.log(formatNumber(999.99)); // "999.99"
console.log(formatNumber(0.001)); // "0.001"
console.log(formatNumber(123456.789)); // "123456.789"
