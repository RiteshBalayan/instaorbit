/**
 * Unit tests for time conversion utilities
 * Run with: npm test timeConversions.test.js
 */

import {
  roundToThreeDecimals,
  convertTimeUnit,
  convertToSeconds,
  getUnitLabel,
  getUnitAbbreviation,
} from '../timeConversions';

describe('Time Conversion Utilities', () => {
  describe('roundToThreeDecimals', () => {
    test('rounds to three decimal places', () => {
      expect(roundToThreeDecimals(1.23456)).toBe(1.235);
      expect(roundToThreeDecimals(1.23444)).toBe(1.234);
      expect(roundToThreeDecimals(10)).toBe(10);
    });

    test('handles negative numbers', () => {
      expect(roundToThreeDecimals(-1.23456)).toBe(-1.235);
    });
  });

  describe('convertTimeUnit', () => {
    test('converts seconds to minutes', () => {
      expect(convertTimeUnit(60, 'm')).toBe(1);
      expect(convertTimeUnit(120, 'm')).toBe(2);
    });

    test('converts seconds to hours', () => {
      expect(convertTimeUnit(3600, 'h')).toBe(1);
      expect(convertTimeUnit(7200, 'h')).toBe(2);
    });

    test('returns seconds for "s" unit', () => {
      expect(convertTimeUnit(100, 's')).toBe(100);
    });

    test('defaults to seconds for unknown unit', () => {
      expect(convertTimeUnit(100, 'x')).toBe(100);
    });
  });

  describe('convertToSeconds', () => {
    test('converts minutes to seconds', () => {
      expect(convertToSeconds(1, 'm')).toBe(60);
      expect(convertToSeconds(2.5, 'm')).toBe(150);
    });

    test('converts hours to seconds', () => {
      expect(convertToSeconds(1, 'h')).toBe(3600);
      expect(convertToSeconds(0.5, 'h')).toBe(1800);
    });

    test('returns seconds unchanged', () => {
      expect(convertToSeconds(100, 's')).toBe(100);
    });
  });

  describe('getUnitLabel', () => {
    test('returns correct labels', () => {
      expect(getUnitLabel('h')).toBe('hour');
      expect(getUnitLabel('m')).toBe('minute');
      expect(getUnitLabel('s')).toBe('second');
    });

    test('defaults to second', () => {
      expect(getUnitLabel('x')).toBe('second');
    });
  });

  describe('getUnitAbbreviation', () => {
    test('returns correct abbreviations', () => {
      expect(getUnitAbbreviation('h')).toBe('H');
      expect(getUnitAbbreviation('m')).toBe('M');
      expect(getUnitAbbreviation('s')).toBe('S');
    });

    test('defaults to S', () => {
      expect(getUnitAbbreviation('x')).toBe('S');
    });
  });
});
