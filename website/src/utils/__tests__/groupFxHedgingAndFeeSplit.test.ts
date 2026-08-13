import { describe, test, expect } from 'vitest';
import { calculateCoBookGroupFxHedgingAndFeeSplit } from '../splitMath';

describe('calculateCoBookGroupFxHedgingAndFeeSplit', () => {
  test('calculates multi-currency FX conversion and foreign transaction fee split correctly', () => {
    const res = calculateCoBookGroupFxHedgingAndFeeSplit({
      baseBookingAmountForeign: 1000,
      foreignCurrencyCode: 'EUR',
      settlementCurrencyCode: 'USD',
      bookingDateFxRate: 1.08,
      settlementDateFxRate: 1.10,
      cardForeignTransactionFeePct: 2.5,
      participantSplitsList: [
        { name: 'Alice', sharePercentage: 50.0 },
        { name: 'Bob', sharePercentage: 50.0 }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.foreignCurrencyCode).toBe('EUR');
    expect(res.settlementCurrencyCode).toBe('USD');
    expect(res.bookingCostSettlementCurr).toBe(1080);
    expect(res.settlementCostSettlementCurr).toBe(1100);
    expect(res.fxVolatilityVarianceAmount).toBe(20);
    expect(res.foreignTransactionFeeTotal).toBe(27.5);
    expect(res.grandTotalSettlementCost).toBe(1127.5);
    expect(res.participantBreakdown?.length).toBe(2);
    expect(res.participantBreakdown?.[0].amountOwedSettlementCurr).toBe(563.75);
    expect(res.participantBreakdown?.[1].amountOwedSettlementCurr).toBe(563.75);
  });

  test('flags high FX volatility exposure on large exchange rate shifts', () => {
    const res = calculateCoBookGroupFxHedgingAndFeeSplit({
      baseBookingAmountForeign: 2000,
      foreignCurrencyCode: 'GBP',
      settlementCurrencyCode: 'USD',
      bookingDateFxRate: 1.25,
      settlementDateFxRate: 1.35, // 8% shift
      cardForeignTransactionFeePct: 3.0,
      participantSplitsList: [
        { name: 'Alice', sharePercentage: 100.0 }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.fxRiskTierStatus).toBe('HIGH_FX_VOLATILITY_EXPOSURE');
    expect(res.fxVolatilityVarianceAmount).toBe(200);
  });

  test('returns error for invalid base booking amount or empty participants', () => {
    const res = calculateCoBookGroupFxHedgingAndFeeSplit({
      baseBookingAmountForeign: -500,
      participantSplitsList: []
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });
});
