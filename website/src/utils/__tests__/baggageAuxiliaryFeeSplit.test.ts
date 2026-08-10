import { describe, it, expect } from 'vitest';
import { calculateGroupTravelBaggageAndAuxiliaryFeeSplit } from '../splitMath';

describe('calculateGroupTravelBaggageAndAuxiliaryFeeSplit', () => {
  it('calculates individual baggage and seat selection shares correctly', () => {
    const input = {
      participantsBaggageList: [
        { name: 'Alice', checkedBagsCount: 2, carryOnBagsCount: 1, hasSportsEquipment: false },
        { name: 'Bob', checkedBagsCount: 1, carryOnBagsCount: 1, hasSportsEquipment: false },
        { name: 'Charlie', checkedBagsCount: 0, carryOnBagsCount: 1, hasSportsEquipment: true }
      ],
      firstCheckedBagFeeUsd: 35.0,
      secondCheckedBagFeeUsd: 45.0,
      sportsEquipmentFeeUsd: 75.0,
      seatSelectionFeePerPersonUsd: 20.0
    };

    const res = calculateGroupTravelBaggageAndAuxiliaryFeeSplit(input);
    expect(res.valid).toBe(true);
    expect(res.participantsCount).toBe(3);
    expect(res.totalGroupSeatSelectionFeeUsd).toBe(60.0);
    // Alice: 35 + 45 + 20 = 100
    expect(res.participantBreakdown?.[0].totalAuxiliaryCostUsd).toBe(100.0);
    // Bob: 35 + 20 = 55
    expect(res.participantBreakdown?.[1].totalAuxiliaryCostUsd).toBe(55.0);
    // Charlie: 75 + 20 = 95
    expect(res.participantBreakdown?.[2].totalAuxiliaryCostUsd).toBe(95.0);
    expect(res.grandTotalAuxiliaryFeesUsd).toBe(250.0);
  });

  it('identifies baggage pooling savings when 2nd bag fees exceed 1st bag fees', () => {
    const input = {
      participantsBaggageList: [
        { name: 'Alice', checkedBagsCount: 2 },
        { name: 'Bob', checkedBagsCount: 0 }
      ],
      firstCheckedBagFeeUsd: 35.0,
      secondCheckedBagFeeUsd: 50.0
    };

    const res = calculateGroupTravelBaggageAndAuxiliaryFeeSplit(input);
    expect(res.valid).toBe(true);
    expect(res.optimizationTier).toBe('BAGGAGE_POOLING_SAVINGS_OPPORTUNITY');
    expect(res.groupPoolingSavingsUsd).toBeGreaterThan(0);
  });

  it('handles empty or invalid inputs gracefully', () => {
    const res = calculateGroupTravelBaggageAndAuxiliaryFeeSplit({ participantsBaggageList: [] });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('non-empty array');
  });
});
