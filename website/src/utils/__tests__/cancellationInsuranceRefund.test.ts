import { describe, test, expect } from 'vitest';
import { calculateGroupTripCancellationInsuranceAndRefundAllocation } from '../splitMath';

describe('calculateGroupTripCancellationInsuranceAndRefundAllocation', () => {
  test('calculates insured refund pool and penalty allocation accurately', () => {
    const res = calculateGroupTripCancellationInsuranceAndRefundAllocation({
      totalBookingCostUsd: 2000,
      insuranceCoverageCapUsd: 1600,
      cancellationPenaltyPct: 20,
      groupMembersCount: 4,
      droppingOutMembersCount: 1,
      insurancePolicyPremiumUsd: 100
    });

    expect(res.valid).toBe(true);
    expect(res.totalBookingCostUsd).toBe(2000);
    expect(res.grossRefundAmountUsd).toBe(1600); // 2000 * 80%
    expect(res.insurancePayoutUsd).toBe(400); // penalty is 400, covered by insurance
    expect(res.netRefundPoolUsd).toBe(1900); // 1600 + 400 - 100
    expect(res.cancellationRiskTier).toBe('SECURE_INSURED_REFUND');
    expect(res.recommendation).toContain('Cancellation fully protected by insurance');
  });

  test('identifies critical uninsured loss when cancellation penalty exceeds coverage cap', () => {
    const res = calculateGroupTripCancellationInsuranceAndRefundAllocation({
      totalBookingCostUsd: 3000,
      insuranceCoverageCapUsd: 0,
      cancellationPenaltyPct: 50,
      groupMembersCount: 3,
      droppingOutMembersCount: 1
    });

    expect(res.valid).toBe(true);
    expect(res.insurancePayoutUsd).toBe(0);
    expect(res.grossRefundAmountUsd).toBe(1500);
    expect(res.cancellationRiskTier).toBe('CRITICAL_UNINSURED_LOSS');
  });

  test('handles invalid inputs gracefully', () => {
    const res = calculateGroupTripCancellationInsuranceAndRefundAllocation({
      totalBookingCostUsd: -100
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe('Total booking cost must be a positive number');
  });
});
