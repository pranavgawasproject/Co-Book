import { describe, test, expect } from 'vitest';
import { calculateEqualSplit, formatCurrency } from '../splitMath';

describe('Co-Book Split Math Utility', () => {
  test('should calculate per-person equal shares accurately without precision loss', () => {
    const result = calculateEqualSplit(100, 3);
    expect(result.perPersonShare).toBe(33.33);
    expect(result.remainderCents).toBe(0.01);
  });

  test('should handle exact divisible amounts', () => {
    const result = calculateEqualSplit(120, 4);
    expect(result.perPersonShare).toBe(30.0);
    expect(result.remainderCents).toBe(0.0);
  });

  test('should handle edge cases with 0 or negative inputs', () => {
    expect(calculateEqualSplit(0, 3)).toEqual({ perPersonShare: 0, remainderCents: 0 });
    expect(calculateEqualSplit(100, 0)).toEqual({ perPersonShare: 0, remainderCents: 0 });
  });

  test('should format currency strings correctly', () => {
    expect(formatCurrency(49.99)).toBe('$49.99');
  });
});
