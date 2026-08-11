import { describe, it, expect } from 'vitest';
import { calculateGroupTransitAndSharedFlightSplit } from '../splitMath';

describe('calculateGroupTransitAndSharedFlightSplit', () => {
  it('calculates equal charter flight split cleanly when all members travel full legs', () => {
    const res = calculateGroupTransitAndSharedFlightSplit({
      participantsList: [
        { name: 'Alice', luggageCount: 1, optOutLegsCount: 0 },
        { name: 'Bob', luggageCount: 1, optOutLegsCount: 0 }
      ],
      charterBaseCostUsd: 1200,
      fuelSurchargeUsd: 200,
      landingAndAirportFeesUsd: 100,
      totalLegsCount: 2
    });

    expect(res.valid).toBe(true);
    expect(res.grandTotalTransitExpenseUsd).toBe(1500);
    expect(res.participantsCount).toBe(2);
    expect(res.splitTier).toBe('EQUAL_CHARTER_SPLIT');
    expect(res.participantBreakdown[0].totalParticipantCostUsd).toBe(750);
    expect(res.participantBreakdown[1].totalParticipantCostUsd).toBe(750);
  });

  it('adjusts pro-rata shares for leg opt-outs correctly', () => {
    const res = calculateGroupTransitAndSharedFlightSplit({
      participantsList: [
        { name: 'Alice', luggageCount: 0, optOutLegsCount: 0 },
        { name: 'Bob', luggageCount: 0, optOutLegsCount: 1 }
      ],
      charterBaseCostUsd: 1000,
      fuelSurchargeUsd: 200,
      landingAndAirportFeesUsd: 100,
      totalLegsCount: 2
    });

    expect(res.valid).toBe(true);
    expect(res.splitTier).toBe('PRO_RATA_LEG_OPT_OUT_SPLIT');
    expect(res.participantBreakdown[0].totalParticipantCostUsd).toBeGreaterThan(res.participantBreakdown[1].totalParticipantCostUsd);
  });

  it('handles empty participants list validation', () => {
    const res = calculateGroupTransitAndSharedFlightSplit({
      participantsList: []
    });

    expect(res.valid).toBe(false);
    expect(res.splitTier).toBe('NO_PARTICIPANTS_SUBMITTED');
  });
});
