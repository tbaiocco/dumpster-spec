/**
 * Test script for date/time normalization functionality
 * 
 * This script demonstrates how the EntityExtractionService normalizes
 * relative dates and times to absolute values.
 * 
 * Run with: node test-scripts/test-date-normalization.js
 */

const chrono = require('chrono-node');

// Simulate the normalization logic
function normalizeDate(dateStr, referenceDate) {
  try {
    const parsed = chrono.parseDate(dateStr, referenceDate);
    
    if (parsed) {
      return parsed.toISOString().split('T')[0];
    }

    const basicParsed = new Date(dateStr);
    if (!isNaN(basicParsed.getTime())) {
      return basicParsed.toISOString().split('T')[0];
    }

    console.warn(`Could not normalize date: ${dateStr}`);
    return dateStr;
  } catch (error) {
    console.warn(`Error normalizing date "${dateStr}": ${error.message}`);
    return dateStr;
  }
}

function normalizeTime(timeStr, referenceDate) {
  try {
    const lowerTime = timeStr.toLowerCase().trim();

    const relativeTimeMap = {
      'midnight': '00:00',
      'early morning': '08:00',
      'morning': '09:00',
      'late morning': '11:00',
      'noon': '12:00',
      'midday': '12:00',
      'afternoon': '14:00',
      'late afternoon': '16:00',
      'evening': '18:00',
      'night': '20:00',
      'late night': '22:00',
    };

    if (relativeTimeMap[lowerTime]) {
      return relativeTimeMap[lowerTime];
    }

    for (const [key, value] of Object.entries(relativeTimeMap)) {
      if (lowerTime.includes(key)) {
        return value;
      }
    }

    const parsed = chrono.parseDate(timeStr, referenceDate);
    
    if (parsed) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
    const match = timeRegex.exec(lowerTime);
    
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    console.warn(`Could not normalize time: ${timeStr}`);
    return timeStr;
  } catch (error) {
    console.warn(`Error normalizing time "${timeStr}": ${error.message}`);
    return timeStr;
  }
}

// Test cases
const referenceDate = new Date('2025-12-03T10:30:00');
console.log('='.repeat(60));
console.log('Date/Time Normalization Test');
console.log('='.repeat(60));
console.log(`Reference Date: ${referenceDate.toISOString()}`);
console.log('');

const dateTests = [
  'tomorrow',
  'next week',
  'next Monday',
  'in 3 days',
  'December 15',
  'Dec 25, 2025',
  '2025-12-25',
  'today',
  'yesterday',
];

const timeTests = [
  'early morning',
  'morning',
  'noon',
  'afternoon',
  'evening',
  'late night',
  '2:30pm',
  '14:30',
  '2:30 PM',
  'at 3pm',
  'in the evening',
];

console.log('DATE NORMALIZATION:');
console.log('-'.repeat(60));
for (const dateStr of dateTests) {
  const normalized = normalizeDate(dateStr, referenceDate);
  console.log(`  "${dateStr}" → "${normalized}"`);
}

console.log('');
console.log('TIME NORMALIZATION:');
console.log('-'.repeat(60));
for (const timeStr of timeTests) {
  const normalized = normalizeTime(timeStr, referenceDate);
  console.log(`  "${timeStr}" → "${normalized}"`);
}

console.log('');
console.log('='.repeat(60));
console.log('COMBINED EXAMPLE:');
console.log('-'.repeat(60));
console.log('Original: "Remind me tomorrow early morning"');
console.log(`Normalized: "${normalizeDate('tomorrow', referenceDate)}" at "${normalizeTime('early morning', referenceDate)}"`);
console.log('');
console.log('Original: "Meeting next Monday at noon"');
console.log(`Normalized: "${normalizeDate('next Monday', referenceDate)}" at "${normalizeTime('noon', referenceDate)}"`);
console.log('='.repeat(60));
