import { describe, test, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateEqualShares,
  calculatePercentageSplit,
  calculateWeightedSplit,
  formatCurrency,
  calculateMultiCurrencyConversion,
  simplifyGroupBalances,
  validateGroupSplitInput,
  calculateTipAndTaxDistributions,
  generateCollaborativeSessionToken,
  calculateCategorySpendingBreakdown
} from '../splitMath';

describe('Co-Book Split Math Utility', () => {
  describe('calculateEqualSplit', () => {
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

    test('should handle edge cases with 0, negative, NaN or Infinity inputs', () => {
      expect(calculateEqualSplit(0, 3)).toEqual({ perPersonShare: 0, remainderCents: 0 });
      expect(calculateEqualSplit(100, 0)).toEqual({ perPersonShare: 0, remainderCents: 0 });
      expect(calculateEqualSplit(-50, 2)).toEqual({ perPersonShare: 0, remainderCents: 0 });
      expect(calculateEqualSplit(100, -1)).toEqual({ perPersonShare: 0, remainderCents: 0 });
      expect(calculateEqualSplit(NaN, 3)).toEqual({ perPersonShare: 0, remainderCents: 0 });
      expect(calculateEqualSplit(100, Infinity)).toEqual({ perPersonShare: 0, remainderCents: 0 });
    });
  });

  describe('calculateEqualShares', () => {
    test('should distribute remainder cents so sum of shares equals total exact amount', () => {
      const shares = calculateEqualShares(100, 3);
      expect(shares).toEqual([33.34, 33.33, 33.33]);
      const totalSum = shares.reduce((acc, val) => acc + val, 0);
      expect(Math.round(totalSum * 100) / 100).toBe(100.00);
    });

    test('should handle uneven cents allocation across member count', () => {
      const shares = calculateEqualShares(10.01, 4);
      expect(shares).toEqual([2.51, 2.50, 2.50, 2.50]);
      const totalSum = shares.reduce((acc, val) => acc + val, 0);
      expect(Math.round(totalSum * 100) / 100).toBe(10.01);
    });

    test('should return correct share for single member', () => {
      expect(calculateEqualShares(499.99, 1)).toEqual([499.99]);
    });

    test('should handle invalid inputs gracefully', () => {
      expect(calculateEqualShares(0, 4)).toEqual([0, 0, 0, 0]);
      expect(calculateEqualShares(100, 0)).toEqual([]);
      expect(calculateEqualShares(-100, 2)).toEqual([0, 0]);
    });
  });

  describe('calculatePercentageSplit', () => {
    test('should calculate percentage splits accurately', () => {
      const result = calculatePercentageSplit(200, [50, 25, 25]);
      expect(result.shares).toEqual([100, 50, 50]);
      expect(result.remainderCents).toBe(0);
    });

    test('should distribute remainder cents when percentages do not cleanly divide cents', () => {
      const result = calculatePercentageSplit(100, [33.33, 33.33, 33.34], true);
      const totalSum = result.shares.reduce((a, b) => a + b, 0);
      expect(Math.round(totalSum * 100) / 100).toBe(100);
    });

    test('should handle invalid percentages (negative or zero)', () => {
      const result = calculatePercentageSplit(100, [-10, 0, 100]);
      expect(result.shares).toEqual([0, 0, 100]);
    });
  });

  describe('calculateWeightedSplit', () => {
    test('should calculate weighted splits accurately', () => {
      const result = calculateWeightedSplit(100, [2, 1, 1]);
      expect(result.shares).toEqual([50, 25, 25]);
      expect(result.remainderCents).toBe(0);
    });

    test('should handle fractional weights', () => {
      const result = calculateWeightedSplit(100, [1.5, 0.5]);
      expect(result.shares).toEqual([75, 25]);
    });

    test('should return zeroes if all weights are zero', () => {
      const result = calculateWeightedSplit(100, [0, 0]);
      expect(result.shares).toEqual([0, 0]);
    });
  });

  describe('formatCurrency', () => {
    test('should format USD strings correctly', () => {
      expect(formatCurrency(49.99, 'USD')).toBe('$49.99');
    });

    test('should format INR strings correctly with indian locale convention', () => {
      const formatted = formatCurrency(50000, 'INR');
      expect(formatted).toMatch(/₹\s?50,000(\.00)?/);
    });

    test('should handle EUR and GBP correctly', () => {
      expect(formatCurrency(1200, 'EUR')).toMatch(/1[.,]200/);
      expect(formatCurrency(75, 'GBP')).toContain('75');
    });

    test('should handle invalid numbers safely without throwing', () => {
      expect(formatCurrency(NaN, 'USD')).toBe('$0.00');
      expect(formatCurrency(Infinity, 'INR')).toMatch(/₹\s?0(\.00)?/);
    });
  });

  describe('calculateMultiCurrencyConversion', () => {
    test('should convert currencies accurately using standard rates', () => {
      expect(calculateMultiCurrencyConversion(100, 'USD', 'USD')).toBe(100);
      expect(calculateMultiCurrencyConversion(100, 'USD', 'INR')).toBe(8350);
      expect(calculateMultiCurrencyConversion(0, 'USD', 'EUR')).toBe(0);
    });
  });

  describe('simplifyGroupBalances', () => {
    test('should simplify net balances into minimal transactions', () => {
      const netBalances = [
        { member: 'Alice', netAmount: -50 },
        { member: 'Bob', netAmount: -30 },
        { member: 'Charlie', netAmount: 80 }
      ];
      const transactions = simplifyGroupBalances(netBalances);
      expect(transactions).toEqual([
        { from: 'Alice', to: 'Charlie', amount: 50 },
        { from: 'Bob', to: 'Charlie', amount: 30 }
      ]);
    });
  });

  describe('validateGroupSplitInput', () => {
    test('validates valid total amount and member names', () => {
      const res = validateGroupSplitInput(150, ['Alice', 'Bob']);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    test('flags invalid amounts or missing members', () => {
      const res = validateGroupSplitInput(0, ['Alice']);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateTipAndTaxDistributions', () => {
    test('proportonally calculates tax and tip on base shares', () => {
      const res = calculateTipAndTaxDistributions(100, 10, 10, [60, 40]);
      expect(res.total).toBe(120);
      expect(res.sharesWithTaxTip).toEqual([72, 48]);
    });

    test('handles zero or invalid base amount gracefully', () => {
      const res = calculateTipAndTaxDistributions(0, 5, 5, [10, 20]);
      expect(res.total).toBe(0);
      expect(res.sharesWithTaxTip).toEqual([0, 0]);
    });
  });
});



