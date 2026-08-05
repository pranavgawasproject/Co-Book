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
  calculateGroupBookingPaymentStagingMilestones,
  calculateGroupFlightCarPoolEfficiencyScore,
  calculateGroupMultiDestinationItineraryEfficiency,
  calculateGroupActivityTicketBulkDiscount,
  calculateGroupTripBudgetVarianceAnalysis,
  calculateGroupTravelInsurancePayerDistribution,
  calculateGroupTripEmergencyContingencyReserve,
  calculateGroupTripCarbonAndBudgetEfficiency,
  calculateGroupTripBudgetForecastAndOptimization,
  calculateGroupTripCancellationRefundDistribution,
  calculateGroupTripExpenseShareWithTieredRatios,
  calculateGroupTripSharedAccommodationSplit,
  calculateGroupFlightAndHotelBundleSplit,
  calculateGroupTripExpenseSettleUpPlan,
  calculateGroupTripExpenseReconciliationAudit,
  calculateGroupTripBudgetVarianceAudit,
  calculateGroupTripDynamicStayProRataSplit,
  calculateGroupTripFlightBaggageShareSplit,
  calculateGroupTripRentalCarFuelAndTollSplit,
  calculateGroupTripAccommodationDepositProration,
  calculateGroupTravelStaggeredPaymentSchedule,
  calculateGroupTripCurrencyConversionAndFeeProration,
  calculateGroupFlightSeatUpgradeAllocation,
  calculateGroupTripExpenseFairnessIndex,
  calculateCoBookMinTransfersSettlementScore,
  calculateCoBookRealtimeCursorSyncBandwidthScore,
  calculateCoBookFlightHotelPackageDealSavings,
  calculateCoBookGroupTravelExpenseReconciliationScore,
  calculateCoBookGroupFlightItineraryAlignmentScore,
  calculateGroupTripItineraryFeasibilityIndex,
  calculateGroupBookingFareDisputeSettlement
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

  describe('calculateGroupFlightCarPoolEfficiencyScore', () => {
    test('calculates optimal carpool savings for large group', () => {
      const res = calculateGroupFlightCarPoolEfficiencyScore(4, 300, 100, 3);
      expect(res.valid).toBe(true);
      expect(res.perPersonRentalCostUsd).toBe(75);
      expect(res.totalIndividualCostUsd).toBe(400);
      expect(res.perPersonSavingsUsd).toBe(25);
      expect(res.efficiencyTier).toBe('CARPOOL_OPTIMAL');
    });

    test('recommends rideshare when individual option is cheaper', () => {
      const res = calculateGroupFlightCarPoolEfficiencyScore(2, 400, 50, 2);
      expect(res.valid).toBe(true);
      expect(res.efficiencyTier).toBe('INDIVIDUAL_RIDESHARE_BETTER');
    });

    test('returns error for invalid zero inputs', () => {
      const res = calculateGroupFlightCarPoolEfficiencyScore(0, 0, 0);
      expect(res.valid).toBe(false);
      expect(res.efficiencyTier).toBe('INVALID_INPUT');
    });
  });

  describe('calculateGroupMultiDestinationItineraryEfficiency', () => {
    test('calculates itinerary efficiency and peak cost city accurately', () => {
      const destinations = [
        { city: 'Tokyo', lodgingCostUsd: 800, transitCostUsd: 200, stayDays: 4 },
        { city: 'Kyoto', lodgingCostUsd: 400, transitCostUsd: 100, stayDays: 2 }
      ];
      const res = calculateGroupMultiDestinationItineraryEfficiency(destinations);
      expect(res.valid).toBe(true);
      expect(res.totalTripCostUsd).toBe(1500);
      expect(res.averageDailySpendUsd).toBe(250);
      expect(res.totalDays).toBe(6);
      expect(res.mostExpensiveCity).toBe('Tokyo');
      expect(res.efficiencyScore).toBe(100);
    });

    test('handles empty destinations array gracefully', () => {
      const res = calculateGroupMultiDestinationItineraryEfficiency([]);
      expect(res.valid).toBe(false);
      expect(res.totalTripCostUsd).toBe(0);
    });
  });

  describe('calculateGroupActivityTicketBulkDiscount', () => {
    test('calculates bulk discount correctly when group size threshold is met', () => {
      const res = calculateGroupActivityTicketBulkDiscount(50, 8, 15);
      expect(res.valid).toBe(true);
      expect(res.totalWithoutDiscountUsd).toBe(400);
      expect(res.perPersonDiscountedPriceUsd).toBe(42.5);
      expect(res.totalWithDiscountUsd).toBe(340);
      expect(res.totalGroupSavingsUsd).toBe(60);
      expect(res.isBulkDiscountApplied).toBe(true);
      expect(res.recommendation).toContain('Group bulk discount of 15% applied!');
    });

    test('does not apply discount if group size is below 5', () => {
      const res = calculateGroupActivityTicketBulkDiscount(50, 3, 15);
      expect(res.valid).toBe(true);
      expect(res.isBulkDiscountApplied).toBe(false);
      expect(res.totalGroupSavingsUsd).toBe(0);
    });

    test('returns invalid for non-positive ticket price or group size', () => {
      const res = calculateGroupActivityTicketBulkDiscount(0, 0);
      expect(res.valid).toBe(false);
      expect(res.totalWithoutDiscountUsd).toBe(0);
    });
  });

  describe('calculateGroupTripBudgetVarianceAnalysis', () => {
    test('calculates spending rate, projected spend, and remaining daily limit accurately', () => {
      const res = calculateGroupTripBudgetVarianceAnalysis(1000, 600, 10, 5);
      expect(res.valid).toBe(true);
      expect(res.allocatedBudgetUsd).toBe(1000);
      expect(res.actualSpentUsd).toBe(600);
      expect(res.dailySpendRateUsd).toBe(120);
      expect(res.projectedTotalSpendUsd).toBe(1200);
      expect(res.budgetStatus).toBe('OVER_BUDGET');
      expect(res.recommendedDailyLimitForRemainingDaysUsd).toBe(80);
      expect(res.recommendation).toContain('Warning: Group is spending $120/day');
    });

    test('returns invalid for zero budget', () => {
      const res = calculateGroupTripBudgetVarianceAnalysis(0, 100, 5, 2);
      expect(res.valid).toBe(false);
      expect(res.recommendation).toContain('Allocated budget must be greater than zero.');
    });
  });

  describe('calculateGroupTravelInsurancePayerDistribution', () => {
    test('calculates group insurance cost breakdown and group discount savings accurately', () => {
      const res = calculateGroupTravelInsurancePayerDistribution({
        basePolicyCostUsd: 200,
        groupDiscountPercentage: 10,
        participants: [
          { name: 'Alice', age: 28, isHighRiskActivity: false },
          { name: 'Bob', age: 62, isHighRiskActivity: true }
        ]
      });
      expect(res.valid).toBe(true);
      expect(res.totalGroupCostUsd).toBe(180);
      expect(res.savingsUsd).toBe(20);
      expect(res.breakdown[0].name).toBe('Alice');
      expect(res.breakdown[1].name).toBe('Bob');
      expect(res.breakdown[1].shareUsd).toBeGreaterThan(res.breakdown[0].shareUsd);
      expect(res.recommendation).toContain('Group travel insurance total is $180.00');
    });

    test('generateCollaborativeSessionToken generates clean token and handles invalid input', () => {
      expect(generateCollaborativeSessionToken('trip-123', 'user-456')).toBe('sync_trip123_user456');
      expect(generateCollaborativeSessionToken('', 'user-456')).toBe('');
      expect(generateCollaborativeSessionToken('trip-123', '')).toBe('');
    });

    test('calculateCategorySpendingBreakdown categorizes and sums expenses accurately', () => {
      const expenses = [
        { category: 'Flights', amount: 350.50 },
        { category: 'Flights', amount: 150.00 },
        { category: 'Hotels', amount: 200.00 },
        { amount: 50.00 }
      ];
      const res = calculateCategorySpendingBreakdown(expenses);
      expect(res['Flights']).toBe(500.50);
      expect(res['Hotels']).toBe(200.00);
      expect(res['General']).toBe(50.00);
      expect(calculateCategorySpendingBreakdown(null as unknown as [])).toEqual({});
    });
  });

  describe('calculateGroupTripEmergencyContingencyReserve', () => {
    test('calculates recommended contingency reserve and per-member contribution correctly', () => {
      const res = calculateGroupTripEmergencyContingencyReserve(5000, 4, 7, 'standard');
      expect(res.valid).toBe(true);
      expect(res.totalReserveAmountUsd).toBe(750);
      expect(res.perMemberReserveContributionUsd).toBe(187.5);
      expect(res.recommendedReservePercentage).toBe(15);
      expect(res.recommendation).toContain('Recommended emergency contingency reserve is $750.00');
    });

    test('applies higher reserve percentage for remote destination risk tier', () => {
      const res = calculateGroupTripEmergencyContingencyReserve(10000, 5, 10, 'remote');
      expect(res.valid).toBe(true);
      expect(res.recommendedReservePercentage).toBe(35);
      expect(res.totalReserveAmountUsd).toBe(3500);
    });

    test('returns invalid for zero expenses or zero duration', () => {
      const res = calculateGroupTripEmergencyContingencyReserve(0, 4, 7);
      expect(res.valid).toBe(false);
      expect(res.recommendation).toContain('Valid trip expenses');
    });
  });

  describe('calculateGroupTripCarbonAndBudgetEfficiency', () => {
    test('calculates carbon and budget savings correctly for group train travel', () => {
      const res = calculateGroupTripCarbonAndBudgetEfficiency(4, 1000, 'train', 800);
      expect(res.valid).toBe(true);
      expect(res.totalCo2KgPerPerson).toBe(40);
      expect(res.co2SavingsPercent).toBe(84);
      expect(res.costSavingsPerPersonUsd).toBe(600); // 800 - 200
      expect(res.efficiencyRating).toBe('HIGH_EFFICIENCY');
      expect(res.recommendation).toContain('Group travel (4 members, train)');
    });

    test('returns invalid for zero group size or zero distance', () => {
      const res = calculateGroupTripCarbonAndBudgetEfficiency(0, 0);
      expect(res.valid).toBe(false);
      expect(res.efficiencyRating).toBe('INVALID_INPUT');
    });
  });

  describe('calculateGroupTripBudgetForecastAndOptimization', () => {
    test('calculates budget forecast and daily spendable rate per person correctly', () => {
      const res = calculateGroupTripBudgetForecastAndOptimization(2000, 1400, 4, 5);
      expect(res.valid).toBe(true);
      expect(res.remainingBufferUsd).toBe(600);
      expect(res.budgetBufferPercent).toBe(30);
      expect(res.dailySpendablePerPersonUsd).toBe(30);
      expect(res.isBudgetSafe).toBe(true);
      expect(res.budgetHealthRating).toBe('HEALTHY');
    });

    test('identifies over-budget state when expenses exceed total budget', () => {
      const res = calculateGroupTripBudgetForecastAndOptimization(1000, 1200, 2, 3);
      expect(res.valid).toBe(true);
      expect(res.remainingBufferUsd).toBe(-200);
      expect(res.isBudgetSafe).toBe(false);
      expect(res.budgetHealthRating).toBe('OVER_BUDGET');
    });
  });

  describe('calculateGroupTripCancellationRefundDistribution', () => {
    test('calculates cancellation refund distribution per participant accurately', () => {
      const res = calculateGroupTripCancellationRefundDistribution({
        totalBookingCostUsd: 1000,
        grossRefundAmountUsd: 800,
        cancellationFeeUsd: 100,
        participantContributions: { Alice: 600, Bob: 400 }
      });
      expect(res.valid).toBe(true);
      expect(res.netRefundPoolUsd).toBe(700);
      expect(res.refundPercentage).toBe(70);
      expect(res.participantRefunds.Alice).toBe(420); // 700 * 0.6
      expect(res.participantRefunds.Bob).toBe(280);   // 700 * 0.4
    });

    test('returns invalid state for non-positive total booking cost', () => {
      const res = calculateGroupTripCancellationRefundDistribution({ totalBookingCostUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.recommendation).toBe('Total booking cost must be greater than 0.');
    });
  });

  describe('calculateGroupTripExpenseShareWithTieredRatios', () => {
    test('splits total expense proportionally according to tiered weights', () => {
      const res = calculateGroupTripExpenseShareWithTieredRatios({
        totalExpenseUsd: 500,
        tieredShares: [
          { name: 'Alice', weight: 1.0 },
          { name: 'Bob', weight: 1.0 }
        ]
      });
      expect(res.valid).toBe(true);
      expect(res.totalExpenseUsd).toBe(500);
      expect(res.totalWeights).toBe(2.0);
      expect(res.individualShares.Alice).toBe(250);
      expect(res.individualShares.Bob).toBe(250);
    });

    test('returns invalid state for zero total expense', () => {
      const res = calculateGroupTripExpenseShareWithTieredRatios({ totalExpenseUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.recommendation).toBe('Valid total expense and non-empty tiered shares array required.');
    });
  });

  describe('calculateGroupTripSharedAccommodationSplit', () => {
    test('calculates lodging split weighted by room tier and nights stayed', () => {
      const roomTiers = [
        { name: 'Alice', roomTier: 'Master Suite', nightsStayed: 4, tierMultiplier: 1.5 },
        { name: 'Bob', roomTier: 'Standard Room', nightsStayed: 4, tierMultiplier: 1.0 },
        { name: 'Charlie', roomTier: 'Standard Room', nightsStayed: 2, tierMultiplier: 1.0 }
      ];
      const res = calculateGroupTripSharedAccommodationSplit({ totalLodgingCostUsd: 1200, roomTiers });
      expect(res.valid).toBe(true);
      expect(res.totalLodgingCostUsd).toBe(1200);
      expect(res.perPersonShareMap.Alice).toBe(600);
      expect(res.perPersonShareMap.Bob).toBe(400);
      expect(res.perPersonShareMap.Charlie).toBe(200);
      expect(res.recommendation).toContain('Total lodging cost $1200.00 split');
    });

    test('returns invalid for zero lodging cost or empty roomTiers', () => {
      const res = calculateGroupTripSharedAccommodationSplit({ totalLodgingCostUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.recommendation).toBe('Valid total lodging cost and room tiers array required.');
    });
  });

  describe('calculateGroupFlightAndHotelBundleSplit', () => {
    test('calculates flight + hotel bundle cost breakdown and deposit required per member accurately', () => {
      const members = [
        { name: 'Alice', flightCostUsd: 400, hotelShareUsd: 500, seatUpgradeUsd: 100 },
        { name: 'Bob', flightCostUsd: 400, hotelShareUsd: 500, seatUpgradeUsd: 0 }
      ];
      const res = calculateGroupFlightAndHotelBundleSplit({
        bundleTotalCostUsd: 1900,
        packageDiscountUsd: 200,
        members,
        depositPercentage: 20
      });
      expect(res.valid).toBe(true);
      expect(res.netPackageCostUsd).toBe(1700);
      expect(res.memberBreakdown.Alice.baseUsd).toBe(1000);
      expect(res.memberBreakdown.Alice.discountUsd).toBe(105.26);
      expect(res.memberBreakdown.Alice.netTotalUsd).toBe(894.74);
      expect(res.memberBreakdown.Alice.depositRequiredUsd).toBe(178.95);
      expect(res.recommendation).toContain('Bundle package cost of $1700.00 split across 2 members');
    });

    test('returns invalid state for zero bundle total cost', () => {
      const res = calculateGroupFlightAndHotelBundleSplit({ bundleTotalCostUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.recommendation).toBe('Valid bundle cost and non-empty members array required.');
    });
  });

  describe('calculateGroupTripExpenseSettleUpPlan', () => {
    test('calculates minimal transactions for unbalanced group expenses', () => {
      const participants = [
        { name: 'Alice', totalPaidUsd: 300 },
        { name: 'Bob', totalPaidUsd: 0 },
        { name: 'Charlie', totalPaidUsd: 0 }
      ];
      const res = calculateGroupTripExpenseSettleUpPlan(participants);
      expect(res.valid).toBe(true);
      expect(res.totalTripExpenseUsd).toBe(300);
      expect(res.transactionCount).toBe(2);
      expect(res.minimalTransactions[0]).toEqual({ from: 'Bob', to: 'Alice', amountUsd: 100 });
      expect(res.minimalTransactions[1]).toEqual({ from: 'Charlie', to: 'Alice', amountUsd: 100 });
      expect(res.isBalanced).toBe(true);
    });

    test('returns invalid state for empty participants array', () => {
      const res = calculateGroupTripExpenseSettleUpPlan([]);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Participants array must be non-empty.');
    });
  });

  describe('calculateGroupTripExpenseReconciliationAudit', () => {
    test('calculates reconciled and settlement ready status for verified expenses', () => {
      const expenses = [
        { id: '1', payerName: 'Alice', amountUsd: 120, hasReceipt: true, isConfirmed: true },
        { id: '2', payerName: 'Bob', amountUsd: 80, hasReceipt: true, isConfirmed: true }
      ];
      const res = calculateGroupTripExpenseReconciliationAudit({ expenses, totalMembersCount: 4 });
      expect(res.valid).toBe(true);
      expect(res.reconciliationTier).toBe('RECONCILED_AND_SETTLEMENT_READY');
      expect(res.reconciliationScore).toBe(100);
      expect(res.perPersonShareUsd).toBe(50);
    });

    test('returns error for invalid members count', () => {
      const res = calculateGroupTripExpenseReconciliationAudit({ totalMembersCount: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Total members count must be a positive number');
    });
  });

  describe('calculateGroupTripBudgetVarianceAudit', () => {
    test('calculates budget variance and over-budget categories correctly', () => {
      const categoryBudgets = {
        lodging: { targetUsd: 1000, actualUsd: 1200 },
        flights: { targetUsd: 800, actualUsd: 750 },
        dining: { targetUsd: 400, actualUsd: 500 }
      };
      const res = calculateGroupTripBudgetVarianceAudit({ categoryBudgets, totalMembersCount: 4 });
      expect(res.valid).toBe(true);
      expect(res.totalTargetUsd).toBe(2200);
      expect(res.totalActualUsd).toBe(2450);
      expect(res.netVarianceUsd).toBe(250);
      expect(res.variancePercentage).toBe(11.36);
      expect(res.perPersonTargetUsd).toBe(550);
      expect(res.perPersonActualUsd).toBe(612.5);
      expect(res.overBudgetCategoriesCount).toBe(2);
      expect(res.budgetStatusTier).toBe('SLIGHT_OVERRUN');
      expect(res.recommendation).toContain('Minor budget overrun of 11.36%');
    });

    test('returns under budget status when actual spend is within target', () => {
      const categoryBudgets = {
        activities: { targetUsd: 500, actualUsd: 400 }
      };
      const res = calculateGroupTripBudgetVarianceAudit({ categoryBudgets });
      expect(res.valid).toBe(true);
      expect(res.budgetStatusTier).toBe('UNDER_BUDGET');
      expect(res.netVarianceUsd).toBe(-100);
      expect(res.recommendation).toContain('Surplus: $100.00');
    });

    test('returns error for invalid input', () => {
      const res = calculateGroupTripBudgetVarianceAudit({ totalMembersCount: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Total members count must be a positive number');
    });
  });

  describe('calculateGroupTripDynamicStayProRataSplit', () => {
    test('calculates pro-rata cost breakdown based on member stay duration correctly', () => {
      const memberStays = [
        { name: 'Alice', nightsAttended: 5 },
        { name: 'Bob', nightsAttended: 3 },
        { name: 'Charlie', nightsAttended: 2 }
      ];
      const res = calculateGroupTripDynamicStayProRataSplit(1000, 5, memberStays);

      expect(res.valid).toBe(true);
      expect(res.totalCostUsd).toBe(1000);
      expect(res.totalTripNights).toBe(5);
      expect(res.totalMemberNights).toBe(10);
      expect(res.costPerMemberNightUsd).toBe(100);
      expect(res.equalSplitPerPersonUsd).toBe(333.33);
      expect(res.memberBreakdown).toHaveLength(3);
      expect(res.memberBreakdown![0].name).toBe('Alice');
      expect(res.memberBreakdown![0].proRataShareUsd).toBe(500);
      expect(res.memberBreakdown![1].name).toBe('Bob');
      expect(res.memberBreakdown![1].proRataShareUsd).toBe(300);
      expect(res.memberBreakdown![2].name).toBe('Charlie');
      expect(res.memberBreakdown![2].proRataShareUsd).toBe(200);
    });

    test('returns error for non-positive total cost or empty member stays', () => {
      const invalidCost = calculateGroupTripDynamicStayProRataSplit(0, 5, [{ name: 'Alice', nightsAttended: 3 }]);
      expect(invalidCost.valid).toBe(false);
      expect(invalidCost.error).toBe('Total cost must be a positive number');

      const invalidMembers = calculateGroupTripDynamicStayProRataSplit(1000, 5, []);
      expect(invalidMembers.valid).toBe(false);
      expect(invalidMembers.error).toBe('Member stays array cannot be empty');
    });
  });

  describe('calculateGroupTripFlightBaggageShareSplit', () => {
    test('calculates per person baggage fee breakdown accurately with overweight weighting', () => {
      const checkedBagsList = [
        { name: 'Alice', checkedBagsCount: 2, isOverweight: true },
        { name: 'Bob', checkedBagsCount: 1, isOverweight: false }
      ];
      const res = calculateGroupTripFlightBaggageShareSplit(160, checkedBagsList);

      expect(res.valid).toBe(true);
      expect(res.totalBaggageFeesUsd).toBe(160);
      expect(res.totalCheckedBagsCount).toBe(3);
      expect(res.perBagCostUsd).toBe(53.33);
      expect(res.memberBaggageBreakdown).toHaveLength(2);
      expect(res.memberBaggageBreakdown![0].name).toBe('Alice');
      expect(res.memberBaggageBreakdown![0].allocatedFeeUsd).toBe(120); // 3 weight factor / 4 total weight * 160
      expect(res.memberBaggageBreakdown![1].name).toBe('Bob');
      expect(res.memberBaggageBreakdown![1].allocatedFeeUsd).toBe(40); // 1 weight factor / 4 total weight * 160
    });

    test('returns error for non-positive total baggage fees or empty list', () => {
      const invalidFee = calculateGroupTripFlightBaggageShareSplit(0, [{ name: 'Alice', checkedBagsCount: 1 }]);
      expect(invalidFee.valid).toBe(false);
      expect(invalidFee.error).toBe('Total baggage fees must be a positive number');

      const invalidList = calculateGroupTripFlightBaggageShareSplit(100, []);
      expect(invalidList.valid).toBe(false);
      expect(invalidList.error).toBe('Checked bags list cannot be empty');
    });
  });

  describe('calculateGroupTripRentalCarFuelAndTollSplit', () => {
    test('calculates rental car total and driver discount share correctly', () => {
      const res = calculateGroupTripRentalCarFuelAndTollSplit(300, 80, 40, 4, 25);
      expect(res.valid).toBe(true);
      expect(res.totalCarExpenseUsd).toBe(420);
      expect(res.perPersonStandardShareUsd).toBe(105);
      expect(res.driverShareUsd).toBe(78.75);
      expect(res.nonDriverShareUsd).toBe(113.75);
      expect(res.recommendation).toContain('Designated driver pays $78.75');
    });

    test('handles solo rental car', () => {
      const res = calculateGroupTripRentalCarFuelAndTollSplit(200, 50, 20, 1);
      expect(res.valid).toBe(true);
      expect(res.totalCarExpenseUsd).toBe(270);
      expect(res.driverShareUsd).toBe(270);
    });

    test('returns error for invalid rental fee or participants count', () => {
      const inv1 = calculateGroupTripRentalCarFuelAndTollSplit(-100, 50, 20, 4);
      expect(inv1.valid).toBe(false);
      expect(inv1.error).toBe('Rental fee must be a non-negative number');

      const inv2 = calculateGroupTripRentalCarFuelAndTollSplit(300, 80, 40, 0);
      expect(inv2.valid).toBe(false);
      expect(inv2.error).toBe('Participants count must be a positive integer');
    });
  });

  describe('calculateGroupTripAccommodationDepositProration', () => {
    test('prorates accommodation deposit based on stay duration and room tier', () => {
      const res = calculateGroupTripAccommodationDepositProration({
        totalDepositUsd: 500,
        totalStayNights: 5,
        guests: [
          { name: 'Alice', nightsStayed: 5, roomTierMultiplier: 1.5 },
          { name: 'Bob', nightsStayed: 5, roomTierMultiplier: 1.0 }
        ]
      });
      expect(res.valid).toBe(true);
      expect(res.totalDepositUsd).toBe(500);
      expect(res.perGuestDepositShareMap?.Alice).toBe(300);
      expect(res.perGuestDepositShareMap?.Bob).toBe(200);
      expect(res.recommendation).toContain('Accommodation deposit of $500.00 prorated');
    });

    test('returns error for empty guests list or zero deposit', () => {
      const res = calculateGroupTripAccommodationDepositProration({ totalDepositUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Valid positive total deposit and non-empty guests list required');
    });
  });

  describe('calculateGroupTravelStaggeredPaymentSchedule', () => {
    test('calculates staggered payment schedule correctly for 4 members and 3 phases', () => {
      const res = calculateGroupTravelStaggeredPaymentSchedule({
        totalBookingAmountUsd: 1200,
        memberCount: 4,
        installmentPhasesCount: 3
      });
      expect(res.valid).toBe(true);
      expect(res.perMemberTotalUsd).toBe(300);
      expect(res.perMemberPerPhaseUsd).toBe(100);
    });

    test('returns error for invalid booking amount', () => {
      const res = calculateGroupTravelStaggeredPaymentSchedule({ totalBookingAmountUsd: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Valid positive total booking amount and member count required');
    });
  });

  describe('calculateGroupTripCurrencyConversionAndFeeProration', () => {
    test('calculates currency conversion and FX fee proration correctly', () => {
      const res = calculateGroupTripCurrencyConversionAndFeeProration({
        foreignAmount: 500,
        exchangeRate: 1.08,
        cardForeignFeePct: 3.0,
        participantsCount: 4
      });
      expect(res.valid).toBe(true);
      expect(res.baseHomeCurrencyUsd).toBe(540);
      expect(res.feeAmountUsd).toBe(16.2);
      expect(res.totalGroupHomeCurrencyUsd).toBe(556.2);
      expect(res.perPersonTotalShareUsd).toBe(139.05);
    });

    test('returns error for non-positive foreign amount or exchange rate', () => {
      const inv = calculateGroupTripCurrencyConversionAndFeeProration({ foreignAmount: 0 });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Foreign amount must be a positive number');
    });
  });

  describe('calculateGroupFlightSeatUpgradeAllocation', () => {
    test('calculates seat upgrade allocation correctly', () => {
      const res = calculateGroupFlightSeatUpgradeAllocation({
        baseTicketCostUsd: 400,
        upgradeFeeUsd: 120,
        upgradedParticipantsCount: 2,
        totalGroupSize: 4
      });
      expect(res.valid).toBe(true);
      expect(res.standardMemberShareUsd).toBe(400);
      expect(res.upgradedMemberShareUsd).toBe(460);
      expect(res.totalGroupCostUsd).toBe(1720);
      expect(res.recommendation).toContain('Standard share: $400.00/person; Upgraded share: $460.00/person');
    });

    test('returns error for invalid base ticket cost or upgraded count', () => {
      const inv1 = calculateGroupFlightSeatUpgradeAllocation({ baseTicketCostUsd: 0 });
      expect(inv1.valid).toBe(false);
      expect(inv1.error).toBe('Base ticket cost must be a positive number');

      const inv2 = calculateGroupFlightSeatUpgradeAllocation({ upgradedParticipantsCount: 5, totalGroupSize: 4 });
      expect(inv2.valid).toBe(false);
      expect(inv2.error).toBe('Upgraded participants count cannot exceed total group size');
    });
  });

  describe('calculateGroupTripExpenseFairnessIndex', () => {
    test('calculates balanced spending fairness index for equal expenses', () => {
      const res = calculateGroupTripExpenseFairnessIndex([100, 100, 100], 100);
      expect(res.valid).toBe(true);
      expect(res.fairnessIndexScore).toBe(100);
      expect(res.fairnessTier).toBe('EQUIVALENT_BALANCED');
    });

    test('returns error for empty expenses array', () => {
      const inv = calculateGroupTripExpenseFairnessIndex([], 100);
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Participant expenses array cannot be empty');
    });
  });

  describe('calculateCoBookMinTransfersSettlementScore', () => {
    test('calculates settlement efficiency score and transfer reduction percentage accurately', () => {
      const res = calculateCoBookMinTransfersSettlementScore({
        totalTripExpenseUsd: 1200,
        participantsCount: 4,
        calculatedTransactionsCount: 2,
        maxPossibleTransactionsCount: 6
      });
      expect(res.valid).toBe(true);
      expect(res.totalTripExpenseUsd).toBe(1200);
      expect(res.participantsCount).toBe(4);
      expect(res.calculatedTransactionsCount).toBe(2);
      expect(res.maxPossibleTransactionsCount).toBe(6);
      expect(res.transferReductionPct).toBe(66.7);
      expect(res.efficiencyScore).toBe(67);
      expect(res.efficiencyTier).toBe('MODERATE_SETTLEMENT_EFFICIENCY');
      expect(res.recommendation).toContain('Group trip settlement optimized');
    });

    test('returns invalid for zero trip expense or participant count <= 1', () => {
      const inv = calculateCoBookMinTransfersSettlementScore({ totalTripExpenseUsd: 0, participantsCount: 1 });
      expect(inv.valid).toBe(false);
      expect(inv.efficiencyTier).toBe('INVALID_INPUT');
    });
  });

  describe('calculateCoBookRealtimeCursorSyncBandwidthScore', () => {
    test('calculates cursor sync bandwidth and quality score correctly', () => {
      const res = calculateCoBookRealtimeCursorSyncBandwidthScore({
        activeUsersCount: 5,
        cursorUpdatesPerSecondPerUser: 30,
        payloadSizeBytes: 64,
        networkLatencyMs: 45
      });
      expect(res.valid).toBe(true);
      expect(res.activeUsersCount).toBe(5);
      expect(res.totalKbitsPerSecond).toBe(76.8);
      expect(res.syncQualityScore).toBe(100);
      expect(res.syncTier).toBe('OPTIMAL_REALTIME_SYNC');
      expect(res.recommendation).toContain('Ultra-smooth multiplayer cursor sync');
    });

    test('returns error for invalid non-positive active users count', () => {
      const inv = calculateCoBookRealtimeCursorSyncBandwidthScore({ activeUsersCount: 0 });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Active users count must be a positive integer');
    });
  });

  describe('calculateCoBookFlightHotelPackageDealSavings', () => {
    test('calculates package bundle savings correctly when deal is present', () => {
      const res = calculateCoBookFlightHotelPackageDealSavings({
        flightStandaloneUsd: 400,
        hotelStandaloneUsd: 600,
        bundledPackagePriceUsd: 850,
        participantsCount: 2
      });
      expect(res.valid).toBe(true);
      expect(res.totalStandaloneUsd).toBe(1000);
      expect(res.totalSavingsUsd).toBe(150);
      expect(res.savingsPercentage).toBe(15);
      expect(res.perPersonPackagePriceUsd).toBe(425);
      expect(res.savingsTier).toBe('HIGH_VALUE_BUNDLE_DEAL');
      expect(res.recommendation).toContain('Package bundle saves $150.00');
    });

    test('returns error for invalid non-positive standalone flight cost', () => {
      const inv = calculateCoBookFlightHotelPackageDealSavings({ flightStandaloneUsd: 0 });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Flight standalone cost must be a positive number');
    });
  });

  describe('calculateCoBookGroupTravelExpenseReconciliationScore', () => {
    test('calculates score and AUDIT_READY_RECONCILIATION tier when pristine', () => {
      const res = calculateCoBookGroupTravelExpenseReconciliationScore({
        totalExpensesCount: 12,
        totalExpenseUsd: 2400,
        unreconciledItemsCount: 0,
        receiptImageProofRatio: 1.0,
        disputedAmountUsd: 0
      });
      expect(res.valid).toBe(true);
      expect(res.reconciliationScore).toBe(100);
      expect(res.reconciliationTier).toBe('AUDIT_READY_RECONCILIATION');
      expect(res.recommendation).toContain('Group trip expenses fully reconciled');
    });

    test('returns error for invalid non-positive total expenses count', () => {
      const res = calculateCoBookGroupTravelExpenseReconciliationScore({ totalExpensesCount: 0 });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Total expenses count must be a positive integer');
    });
  });

  describe('calculateCoBookGroupFlightItineraryAlignmentScore', () => {
    test('calculates high alignment score when arrival times are closely staggered', () => {
      const res = calculateCoBookGroupFlightItineraryAlignmentScore({
        memberArrivalTimesHours: [12.0, 12.5, 13.0, 13.5],
        maxAcceptableSpreadHours: 3.0,
        sameArrivalAirport: true
      });
      expect(res.valid).toBe(true);
      expect(res.memberCount).toBe(4);
      expect(res.arrivalSpreadHours).toBe(1.5);
      expect(res.alignmentScore).toBe(100);
      expect(res.alignmentTier).toBe('OPTIMAL_ITINERARY_ALIGNMENT');
      expect(res.recommendation).toContain('Flight itineraries well-aligned');
    });

    test('reduces alignment score when arrival times exceed target spread', () => {
      const res = calculateCoBookGroupFlightItineraryAlignmentScore({
        memberArrivalTimesHours: [10.0, 16.0],
        maxAcceptableSpreadHours: 2.0,
        sameArrivalAirport: true
      });
      expect(res.valid).toBe(true);
      expect(res.arrivalSpreadHours).toBe(6.0);
      expect(res.alignmentScore).toBeLessThan(80);
      expect(res.alignmentTier).toBe('POOR_ITINERARY_ALIGNMENT');
    });

    test('returns error for empty member arrival times array', () => {
      const inv = calculateCoBookGroupFlightItineraryAlignmentScore({ memberArrivalTimesHours: [] });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Member arrival times array cannot be empty');
    });
  });

  describe('calculateGroupTripItineraryFeasibilityIndex', () => {
    test('calculates well-paced itinerary feasibility index correctly', () => {
      const res = calculateGroupTripItineraryFeasibilityIndex({
        totalActivitiesCount: 8,
        totalTravelDays: 4,
        totalDistanceKm: 120,
        maxDailyTravelHours: 4.0
      });
      expect(res.valid).toBe(true);
      expect(res.activitiesPerDay).toBe(2);
      expect(res.feasibilityScore).toBe(100);
      expect(res.feasibilityTier).toBe('FEASIBLE_WELL_PACED');
      expect(res.recommendation).toContain('Itinerary is well-paced');
    });

    test('returns error for non-positive activity count or travel days', () => {
      const inv = calculateGroupTripItineraryFeasibilityIndex({ totalActivitiesCount: 0 });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Total activities count must be a positive integer');

      const invDays = calculateGroupTripItineraryFeasibilityIndex({ totalTravelDays: 0 });
      expect(invDays.valid).toBe(false);
      expect(invDays.error).toBe('Total travel days must be a positive integer');
    });
  });

  describe('calculateGroupBookingFareDisputeSettlement', () => {
    test('calculates fair dispute settlement across non-exempt group members', () => {
      const res = calculateGroupBookingFareDisputeSettlement({
        totalBookingCost: 1200,
        disputedAmount: 300,
        participatingMembers: ['Alice', 'Bob', 'Charlie'],
        exemptMembers: ['Charlie']
      });
      expect(res.valid).toBe(true);
      expect(res.baseSharePerMember).toBe(400);
      expect(res.adjustedSharePerMember?.Alice).toBe(550);
      expect(res.adjustedSharePerMember?.Bob).toBe(550);
      expect(res.adjustedSharePerMember?.Charlie).toBe(400);
    });

    test('returns invalid for zero booking cost or empty member list', () => {
      const inv = calculateGroupBookingFareDisputeSettlement({ totalBookingCost: 0 });
      expect(inv.valid).toBe(false);
      expect(inv.error).toBe('Total booking cost must be a positive number');
    });
  });
});


































