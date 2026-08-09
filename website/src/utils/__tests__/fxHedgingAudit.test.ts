import { describe, test, expect } from 'vitest';
import { calculateCoBookGroupTravelFxHedgingAndVolatilityAudit } from '../splitMath';

describe('calculateCoBookGroupTravelFxHedgingAndVolatilityAudit', () => {
  test('calculates stable FX exchange rates correctly', () => {
    const res = calculateCoBookGroupTravelFxHedgingAndVolatilityAudit({
      bookingExpenses: [
        { expenseId: 'e1', amountBase: 1000, lockedFxRate: 1.10, currentFxRate: 1.105 }
      ],
      maxAllowedSlippagePercent: 2.0,
      numberOfParticipants: 4
    });

    expect(res.valid).toBe(true);
    expect(res.hedgingRiskTier).toBe('LOW_FX_RISK');
    expect(res.perPersonAdjustedSettlementUsd).toBeGreaterThan(0);
  });

  test('flags HIGH_FX_RISK when FX rate slippage exceeds threshold', () => {
    const res = calculateCoBookGroupTravelFxHedgingAndVolatilityAudit({
      bookingExpenses: [
        { expenseId: 'e1', amountBase: 5000, lockedFxRate: 1.00, currentFxRate: 1.12 }
      ],
      maxAllowedSlippagePercent: 2.0,
      numberOfParticipants: 5
    });

    expect(res.valid).toBe(true);
    expect(res.hedgingRiskTier).toBe('HIGH_FX_RISK');
    expect(res.recommendedHedgingBufferUsd).toBeGreaterThan(0);
  });

  test('returns error for empty booking expenses array', () => {
    const res = calculateCoBookGroupTravelFxHedgingAndVolatilityAudit({
      bookingExpenses: []
    });

    expect(res.valid).toBe(false);
    expect(res.hedgingRiskTier).toBe('INELIGIBLE');
  });
});
