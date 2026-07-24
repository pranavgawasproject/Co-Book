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
  calculateCoBookingDiscountShare,
  calculateGroupFlightVsHotelSplitRatio,
  calculateGroupTravelCurrencyConversionSplit,
  calculateMultiplayerSyncSessionState,
  calculateGroupFlightPriceAlertThreshold,
  calculateGroupItineraryTimeSlotConflictScore,
  calculateGroupExpenseEquitabilityIndex,
  calculateGroupExpenseSettlementOptimizations,
  calculateGroupTravelActivityBudgetAllocation,
  calculateGroupSharedLodgingCostOptimization,
  calculateGroupTripBudgetVarianceScore,
  calculateGroupSettlementFairnessIndex,
  calculateGroupTripCurrencyReserve,
  calculateGroupBookingPaymentStagingMilestones
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

  describe('calculateGroupFlightVsHotelSplitRatio', () => {
    test('calculates flight vs hotel percentages and per person breakdown', () => {
      const res = calculateGroupFlightVsHotelSplitRatio(600, 400, 4);
      expect(res.valid).toBe(true);
      expect(res.totalBookingCost).toBe(1000);
      expect(res.flightPercentage).toBe(60);
      expect(res.hotelPercentage).toBe(40);
      expect(res.perPersonFlightShare).toBe(150);
      expect(res.perPersonHotelShare).toBe(100);
      expect(res.perPersonTotalShare).toBe(250);
    });

    test('handles zero totals or participants gracefully', () => {
      const res = calculateGroupFlightVsHotelSplitRatio(0, 0, 0);
      expect(res.valid).toBe(false);
      expect(res.totalBookingCost).toBe(0);
    });
  });

  describe('calculateGroupTravelCurrencyConversionSplit', () => {
    test('calculates foreign currency conversion, service fees and per person share', () => {
      const res = calculateGroupTravelCurrencyConversionSplit(100, 1.2, 2.5, 4);
      expect(res.valid).toBe(true);
      expect(res.totalHomeCurrencyAmount).toBe(120);
      expect(res.totalFeeAmount).toBe(3);
      expect(res.netPayableHomeCurrency).toBe(123);
      expect(res.perPersonShareHomeCurrency).toBe(30.75);
    });

    test('handles zero or invalid foreign amount gracefully', () => {
      const res = calculateGroupTravelCurrencyConversionSplit(0, 1.2);
      expect(res.valid).toBe(false);
      expect(res.netPayableHomeCurrency).toBe(0);
    });
  });

  describe('calculateMultiplayerSyncSessionState', () => {
    test('calculates active participants, consensus ratio and booking readiness', () => {
      const participants = [
        { id: '1', name: 'Alex', isApproved: true, isActive: true },
        { id: '2', name: 'Sam', isApproved: true, isActive: true },
        { id: '3', name: 'Jordan', isApproved: false, isActive: true }
      ];
      const res = calculateMultiplayerSyncSessionState(participants, 300);
      expect(res.valid).toBe(true);
      expect(res.totalParticipants).toBe(3);
      expect(res.activeCount).toBe(3);
      expect(res.approvedCount).toBe(2);
      expect(res.consensusPercentage).toBe(67);
      expect(res.isReadyToBook).toBe(false);
      expect(res.perParticipantShare).toBe(100);
    });

    test('returns ready to book when all participants approve', () => {
      const participants = [
        { id: '1', name: 'Alex', isApproved: true },
        { id: '2', name: 'Sam', isApproved: true }
      ];
      const res = calculateMultiplayerSyncSessionState(participants, 200);
      expect(res.isReadyToBook).toBe(true);
      expect(res.consensusPercentage).toBe(100);
    });

    test('handles empty participants array gracefully', () => {
      const res = calculateMultiplayerSyncSessionState([], 100);
      expect(res.valid).toBe(false);
      expect(res.isReadyToBook).toBe(false);
    });
  });

  describe('calculateGroupFlightPriceAlertThreshold', () => {
    test('calculates group savings, discount percentage, and alert trigger status', () => {
      const res = calculateGroupFlightPriceAlertThreshold(500, 400, 4);
      expect(res.valid).toBe(true);
      expect(res.currentTotal).toBe(2000);
      expect(res.targetTotal).toBe(1600);
      expect(res.potentialGroupSavings).toBe(400);
      expect(res.discountPercentage).toBe(20);
      expect(res.shouldAlertGroup).toBe(true);
    });

    test('returns invalid for zero prices', () => {
      const res = calculateGroupFlightPriceAlertThreshold(0, 400);
      expect(res.valid).toBe(false);
      expect(res.shouldAlertGroup).toBe(false);
    });
  });

  describe('calculateGroupItineraryTimeSlotConflictScore', () => {
    test('detects overlapping time slots and reports conflicts', () => {
      const events = [
        { title: 'Flight Arrival', startHour: 10, endHour: 12 },
        { title: 'Hotel Check-in', startHour: 11, endHour: 13 },
        { title: 'Dinner', startHour: 18, endHour: 20 }
      ];
      const res = calculateGroupItineraryTimeSlotConflictScore(events);
      expect(res.valid).toBe(true);
      expect(res.totalEvents).toBe(3);
      expect(res.conflictCount).toBe(1);
      expect(res.hasScheduleConflicts).toBe(true);
      expect(res.conflicts[0]).toEqual({ event1: 'Flight Arrival', event2: 'Hotel Check-in' });
    });

    test('handles empty events array gracefully', () => {
      const res = calculateGroupItineraryTimeSlotConflictScore([]);
      expect(res.valid).toBe(false);
      expect(res.hasScheduleConflicts).toBe(false);
    });
  });

  describe('calculateGroupExpenseEquitabilityIndex', () => {
    test('calculates group expense equitability and net balances', () => {
      const memberPayments = [
        { memberName: 'Alice', amountPaid: 300 },
        { memberName: 'Bob', amountPaid: 100 },
        { memberName: 'Charlie', amountPaid: 200 }
      ];
      const res = calculateGroupExpenseEquitabilityIndex(memberPayments);
      expect(res.valid).toBe(true);
      expect(res.totalGroupExpense).toBe(600);
      expect(res.perMemberAverage).toBe(200);
      expect(res.memberCount).toBe(3);
      expect(res.netBalances.Alice).toBe(100);
      expect(res.netBalances.Bob).toBe(-100);
      expect(res.netBalances.Charlie).toBe(0);
    });

    test('handles empty member payments gracefully', () => {
      const res = calculateGroupExpenseEquitabilityIndex([]);
      expect(res.valid).toBe(false);
      expect(res.isEquitable).toBe(true);
    });
  });

  describe('calculateGroupExpenseSettlementOptimizations', () => {
    test('optimizes group debt settlements accurately', () => {
      const balances = { Alice: 100, Bob: -60, Charlie: -40 };
      const res = calculateGroupExpenseSettlementOptimizations(balances);
      expect(res.valid).toBe(true);
      expect(res.totalSettlementCount).toBe(2);
      expect(res.totalVolumeSettled).toBe(100);
      expect(res.settlements[0]).toEqual({ from: 'Bob', to: 'Alice', amount: 60 });
      expect(res.settlements[1]).toEqual({ from: 'Charlie', to: 'Alice', amount: 40 });
    });

    test('handles empty or zero balances gracefully', () => {
      const res = calculateGroupExpenseSettlementOptimizations({});
      expect(res.valid).toBe(false);
      expect(res.totalSettlementCount).toBe(0);
      expect(res.totalVolumeSettled).toBe(0);
    });
  });

  describe('calculateGroupTravelActivityBudgetAllocation', () => {
    test('calculates budget per person and category breakdown correctly', () => {
      const res = calculateGroupTravelActivityBudgetAllocation(2000, 4, { lodging: 0.4, flights: 0.35, food: 0.15, activities: 0.1 });
      expect(res.valid).toBe(true);
      expect(res.totalTravelBudget).toBe(2000);
      expect(res.participantsCount).toBe(4);
      expect(res.perPersonBudget).toBe(500);
      expect(res.categoryBreakdown.lodging).toBe(800);
      expect(res.categoryBreakdown.flights).toBe(700);
      expect(res.categoryBreakdown.food).toBe(300);
      expect(res.categoryBreakdown.activities).toBe(200);
    });

    test('returns invalid for zero budget or zero participants', () => {
      const res = calculateGroupTravelActivityBudgetAllocation(0, 4);
      expect(res.valid).toBe(false);
      expect(res.perPersonBudget).toBe(0);
    });
  });

  describe('calculateGroupSharedLodgingCostOptimization', () => {
    test('calculates shared villa lodging cost per person and nightly breakdown correctly', () => {
      const res = calculateGroupSharedLodgingCostOptimization(300, 5, 6);
      expect(res.valid).toBe(true);
      expect(res.totalLodgingCostUsd).toBe(1500);
      expect(res.perPersonLodgingCostUsd).toBe(250);
      expect(res.perPersonNightlyRateUsd).toBe(50);
      expect(res.recommendation).toContain('Group of 6 sharing villa');
    });

    test('returns invalid for zero rate or duration', () => {
      const res = calculateGroupSharedLodgingCostOptimization(0, 5, 6);
      expect(res.valid).toBe(false);
      expect(res.perPersonLodgingCostUsd).toBe(0);
    });
  });

  describe('calculateGroupTripBudgetVarianceScore', () => {
    test('calculates over-budget variance and per person deviation correctly', () => {
      const res = calculateGroupTripBudgetVarianceScore(1000, 1200, 4);
      expect(res.valid).toBe(true);
      expect(res.plannedBudgetUsd).toBe(1000);
      expect(res.actualSpentUsd).toBe(1200);
      expect(res.varianceAmountUsd).toBe(200);
      expect(res.variancePercentage).toBe(20);
      expect(res.isOverBudget).toBe(true);
      expect(res.perPersonVarianceUsd).toBe(50);
      expect(res.recommendation).toContain('20% over budget');
    });

    test('returns invalid for non-positive planned budget', () => {
      const res = calculateGroupTripBudgetVarianceScore(0, 500);
      expect(res.valid).toBe(false);
      expect(res.isOverBudget).toBe(false);
    });
  });

  describe('calculateGroupSettlementFairnessIndex', () => {
    test('calculates fairness index and max debtor/creditor', () => {
      const netBalances = { Alice: 100, Bob: -60, Charlie: -40 };
      const res = calculateGroupSettlementFairnessIndex(netBalances);
      expect(res.valid).toBe(true);
      expect(res.participantCount).toBe(3);
      expect(res.totalImbalanceUsd).toBe(200);
      expect(res.maxDebtor).toBe('Bob');
      expect(res.maxCreditor).toBe('Alice');
      expect(res.isFair).toBe(true);
    });

    test('returns invalid for empty net balances map', () => {
      const res = calculateGroupSettlementFairnessIndex({});
      expect(res.valid).toBe(false);
      expect(res.recommendation).toBe('Net balances map cannot be empty.');
    });
  });

  describe('calculateGroupTripCurrencyReserve', () => {
    test('calculates currency volatility reserve and target contribution correctly', () => {
      const res = calculateGroupTripCurrencyReserve(2000, 5, 10, 4);
      expect(res.valid).toBe(true);
      expect(res.estimatedTotalCostHomeCurrency).toBe(2000);
      expect(res.currencyVolatilityReserveUsd).toBe(100);
      expect(res.contingencyBufferUsd).toBe(200);
      expect(res.recommendedTotalGroupReserveUsd).toBe(2300);
      expect(res.perMemberTargetContributionUsd).toBe(575);
      expect(res.safetyTier).toBe('CONSERVATIVE');
    });

    test('returns invalid for zero total cost or zero member count', () => {
      const res = calculateGroupTripCurrencyReserve(0, 5, 10, 0);
      expect(res.valid).toBe(false);
      expect(res.recommendedTotalGroupReserveUsd).toBe(0);
    });
  });

  describe('calculateGroupBookingPaymentStagingMilestones', () => {
    test('calculates deposit and installment schedule correctly', () => {
      const res = calculateGroupBookingPaymentStagingMilestones({
        totalBookingCostUsd: 1200,
        depositPercentage: 25,
        installmentCount: 3,
        memberCount: 4
      });
      expect(res.valid).toBe(true);
      expect(res.totalBookingCostUsd).toBe(1200);
      expect(res.depositAmountUsd).toBe(300);
      expect(res.perMemberDepositUsd).toBe(75);
      expect(res.remainingBalanceUsd).toBe(900);
      expect(res.installmentAmountUsd).toBe(300);
      expect(res.perMemberInstallmentUsd).toBe(75);
      expect(res.schedule.length).toBe(4);
    });

    test('returns invalid for invalid cost or member count', () => {
      const res = calculateGroupBookingPaymentStagingMilestones({
        totalBookingCostUsd: -100,
        memberCount: 0
      });
      expect(res.valid).toBe(false);
      expect(res.schedule.length).toBe(0);
    });
  });
});















