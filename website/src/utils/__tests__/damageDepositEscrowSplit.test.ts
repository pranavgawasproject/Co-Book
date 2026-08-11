import { describe, it, expect } from 'vitest';
import { calculateCoBookDamageDepositEscrowSplit } from '../splitMath';

describe('calculateCoBookDamageDepositEscrowSplit', () => {
  it('calculates full security deposit refund split cleanly when no damages or FX fees occur', () => {
    const res = calculateCoBookDamageDepositEscrowSplit({
      totalDepositUsd: 1000,
      merchantRefundedAmountUsd: 1000,
      participantsList: [
        { name: 'Alice', roomDamageDeductionUsd: 0 },
        { name: 'Bob', roomDamageDeductionUsd: 0 }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.totalDepositUsd).toBe(1000);
    expect(res.netRefundedUsd).toBe(1000);
    expect(res.splitTier).toBe('FULL_SECURITY_DEPOSIT_REFUND');
    expect(res.participantRefundBreakdown[0].netRefundUsd).toBe(500);
    expect(res.participantRefundBreakdown[1].netRefundUsd).toBe(500);
  });

  it('handles itemized room damage deduction correctly', () => {
    const res = calculateCoBookDamageDepositEscrowSplit({
      totalDepositUsd: 1000,
      merchantRefundedAmountUsd: 800,
      participantsList: [
        { name: 'Alice', roomDamageDeductionUsd: 200 },
        { name: 'Bob', roomDamageDeductionUsd: 0 }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.splitTier).toBe('ITEMIZED_ROOM_DAMAGE_DEDUCTION');
    expect(res.participantRefundBreakdown[0].netRefundUsd).toBe(300);
    expect(res.participantRefundBreakdown[1].netRefundUsd).toBe(500);
  });

  it('handles invalid input validation cleanly', () => {
    const res = calculateCoBookDamageDepositEscrowSplit({
      totalDepositUsd: 0,
      participantsList: []
    });

    expect(res.valid).toBe(false);
    expect(res.splitTier).toBe('INVALID_INPUT');
  });
});
