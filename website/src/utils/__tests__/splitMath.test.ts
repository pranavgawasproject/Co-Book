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
  calculateCategorySpendingBreakdown,
  calculateBudgetPerPersonCap,
  calculateGroupBudgetVelocity,
  calculateGroupSettleUpPlan,
  calculateGroupExpenseFairnessIndex,
  calculateGroupDepositEscrowShares,
  calculateGroupFlightSeatUpgradeShare,
  calculateTripCurrencyConversionRate,
  calculateGroupCustomRatioSplit,
  calculateCoBookingDiscountShare
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

  describe('calculateBudgetPerPersonCap', () => {
    test('calculates per person budget and cap status', () => {
      const ok = calculateBudgetPerPersonCap(300, 3, 150);
      expect(ok.perPersonBudget).toBe(100);
      expect(ok.exceedsCap).toBe(false);
      expect(ok.excessPerPerson).toBe(0);

      const excess = calculateBudgetPerPersonCap(600, 3, 150);
      expect(excess.perPersonBudget).toBe(200);
      expect(excess.exceedsCap).toBe(true);
      expect(excess.excessPerPerson).toBe(50);
    });

    test('handles invalid inputs gracefully', () => {
      const res = calculateBudgetPerPersonCap(0, 3);
      expect(res.perPersonBudget).toBe(0);
      expect(res.exceedsCap).toBe(false);
    });
  });

  describe('calculateGroupBudgetVelocity', () => {
    test('calculates burn rate and projected total correctly', () => {
      const expenses = [{ amount: 150 }, { amount: 250 }];
      const res = calculateGroupBudgetVelocity(expenses, 1000, 4, 10);
      expect(res.dailyBurnRate).toBe(100);
      expect(res.projectedTotalSpend).toBe(1000);
      expect(res.isOverBudget).toBe(false);
      expect(res.budgetUtilizationPercentage).toBe(40);
    });

    test('flags over-budget scenario when velocity exceeds total budget', () => {
      const expenses = [{ amount: 600 }];
      const res = calculateGroupBudgetVelocity(expenses, 1000, 3, 10);
      expect(res.dailyBurnRate).toBe(200);
      expect(res.projectedTotalSpend).toBe(2000);
      expect(res.isOverBudget).toBe(true);
    });

    test('handles invalid inputs gracefully', () => {
      const res = calculateGroupBudgetVelocity([], 0, 0, 0);
      expect(res.dailyBurnRate).toBe(0);
      expect(res.isOverBudget).toBe(false);
    });
  });

  describe('calculateGroupSettleUpPlan', () => {
    test('generates settle up transactions and total settlement volume', () => {
      const balances = { Alice: -50, Bob: 50 };
      const res = calculateGroupSettleUpPlan(balances);
      expect(res.isSettled).toBe(false);
      expect(res.totalVolume).toBe(50);
      expect(res.transactions).toEqual([{ from: 'Alice', to: 'Bob', amount: 50 }]);
    });

    test('returns settled status when all balances are zero', () => {
      const balances = { Alice: 0, Bob: 0 };
      const res = calculateGroupSettleUpPlan(balances);
      expect(res.isSettled).toBe(true);
      expect(res.totalVolume).toBe(0);
      expect(res.transactions).toHaveLength(0);
    });
  });

  describe('calculateGroupExpenseFairnessIndex', () => {
    test('calculates fairness index, rating, top payer and ower correctly', () => {
      const balances = { Alice: 150, Bob: -100, Charlie: -50 };
      const res = calculateGroupExpenseFairnessIndex(balances);
      expect(res.fairnessScore).toBeLessThan(100);
      expect(res.topPayer).toBe('Alice');
      expect(res.topOwer).toBe('Bob');
    });

    test('returns 100 score for balanced group', () => {
      const res = calculateGroupExpenseFairnessIndex({ Alice: 0, Bob: 0 });
      expect(res.fairnessScore).toBe(100);
      expect(res.rating).toBe('Highly Balanced');
    });
  });

  describe('calculateGroupDepositEscrowShares', () => {
    test('calculates deposit share and damage deductions per person', () => {
      const damages = [{ amount: 120 }];
      const res = calculateGroupDepositEscrowShares(damages, 600, 3);
      expect(res.perPersonDeposit).toBe(200);
      expect(res.deductedDamagePerPerson).toBe(40);
      expect(res.remainingRefundablePerPerson).toBe(160);
    });

    test('handles zero damages and invalid inputs gracefully', () => {
      const res = calculateGroupDepositEscrowShares([], 300, 3);
      expect(res.perPersonDeposit).toBe(100);
      expect(res.deductedDamagePerPerson).toBe(0);
      expect(res.remainingRefundablePerPerson).toBe(100);

      const invalid = calculateGroupDepositEscrowShares([], 0, 0);
      expect(invalid.perPersonDeposit).toBe(0);
    });
  });

  describe('calculateGroupFlightSeatUpgradeShare', () => {
    test('calculates flight cost per person for base vs upgraded members', () => {
      const res = calculateGroupFlightSeatUpgradeShare(1200, 300, 4, 2);
      expect(res.basePerPerson).toBe(300);
      expect(res.upgradedPerPerson).toBe(450);
      expect(res.totalFlightCost).toBe(1500);
    });

    test('handles zero upgrade fee or invalid input gracefully', () => {
      const res = calculateGroupFlightSeatUpgradeShare(800, 0, 4, 0);
      expect(res.basePerPerson).toBe(200);
      expect(res.upgradedPerPerson).toBe(200);
      expect(res.totalFlightCost).toBe(800);

      const invalid = calculateGroupFlightSeatUpgradeShare(0, 0, 0, 0);
      expect(invalid.basePerPerson).toBe(0);
    });
  });

  describe('calculateTripCurrencyConversionRate', () => {
    test('converts amount and computes platform fee', () => {
      const res = calculateTripCurrencyConversionRate(100, 1.2, 2.5);
      expect(res.convertedAmount).toBe(120);
      expect(res.platformFeeAmount).toBe(3);
      expect(res.finalTotal).toBe(123);
    });

    test('handles invalid inputs safely', () => {
      const res = calculateTripCurrencyConversionRate(-50, 0);
      expect(res.convertedAmount).toBe(0);
      expect(res.finalTotal).toBe(0);
    });
  });

  describe('calculateGroupCustomRatioSplit', () => {
    test('splits amount according to custom numerical ratio', () => {
      const res = calculateGroupCustomRatioSplit(100, [3, 2, 1]);
      expect(res.shares[0] + res.shares[1] + res.shares[2]).toBe(100);
      expect(res.shares[0]).toBe(50.01);
      expect(res.shares[1]).toBe(33.33);
      expect(res.shares[2]).toBe(16.66);

    });

    test('handles invalid or empty ratios gracefully', () => {
      const res = calculateGroupCustomRatioSplit(100, []);
      expect(res.shares).toEqual([]);
      expect(res.remainderCents).toBe(0);
    });
  });

  describe('calculateCoBookingDiscountShare', () => {
    test('calculates coupon discount distribution and per person net payable accurately', () => {
      const res = calculateCoBookingDiscountShare(200, 10, 4);
      expect(res.valid).toBe(true);
      expect(res.totalOrderAmount).toBe(200);
      expect(res.totalDiscountAmount).toBe(20);
      expect(res.netOrderAmount).toBe(180);
      expect(res.perPersonOriginalShare).toBe(50);
      expect(res.perPersonDiscountShare).toBe(5);
      expect(res.perPersonNetPayable).toBe(45);
    });

    test('returns invalid state for invalid order total or participant count', () => {
      const res = calculateCoBookingDiscountShare(0, 10, 0);
      expect(res.valid).toBe(false);
      expect(res.netOrderAmount).toBe(0);
    });
  });
});








