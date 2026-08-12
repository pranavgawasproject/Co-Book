import { describe, it, expect } from 'vitest';
import { calculateGroupBookingPriceLockEscrowSplit } from '../splitMath';

describe('calculateGroupBookingPriceLockEscrowSplit', () => {
  it('calculates fully funded price lock escrow when all members confirm and pay', () => {
    const result = calculateGroupBookingPriceLockEscrowSplit({
      totalBookingPriceUsd: 2400,
      optionLockFeePct: 5.0,
      downPaymentDepositPct: 15.0,
      membersList: [
        { name: 'Alice', confirmedAndPaid: true },
        { name: 'Bob', confirmedAndPaid: true },
        { name: 'Charlie', confirmedAndPaid: true }
      ],
      priceLockWindowDays: 7
    });

    expect(result.valid).toBe(true);
    expect(result.totalBookingPriceUsd).toBe(2400);
    expect(result.membersCount).toBe(3);
    expect(result.confirmedMembersCount).toBe(3);
    expect(result.unconfirmedMembersCount).toBe(0);
    expect(result.optionLockFeeTotalUsd).toBe(120);
    expect(result.downPaymentDepositTotalUsd).toBe(360);
    expect(result.isPriceLockFullyFunded).toBe(true);
    expect(result.escrowStatusTier).toBe('PRICE_LOCK_FULLY_ESCROWED');
  });

  it('calculates escrow shortfall when members are pending confirmation', () => {
    const result = calculateGroupBookingPriceLockEscrowSplit({
      totalBookingPriceUsd: 2000,
      optionLockFeePct: 5.0,
      downPaymentDepositPct: 15.0,
      membersList: [
        { name: 'Alice', confirmedAndPaid: true },
        { name: 'Bob', confirmedAndPaid: false },
        { name: 'Charlie', confirmedAndPaid: false }
      ],
      priceLockWindowDays: 5
    });

    expect(result.valid).toBe(true);
    expect(result.confirmedMembersCount).toBe(1);
    expect(result.unconfirmedMembersCount).toBe(2);
    expect(result.isPriceLockFullyFunded).toBe(false);
    expect(result.outstandingEscrowShortfallUsd).toBeGreaterThan(0);
  });

  it('handles invalid zero price or empty members list gracefully', () => {
    const result = calculateGroupBookingPriceLockEscrowSplit({
      totalBookingPriceUsd: 0,
      membersList: []
    });

    expect(result.valid).toBe(false);
    expect(result.escrowStatusTier).toBe('INVALID_INPUT');
  });
});
