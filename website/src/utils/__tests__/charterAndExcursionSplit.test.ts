import { describe, it, expect } from 'vitest';
import { calculateCoBookCharterAndExcursionSplit } from '../splitMath';

describe('calculateCoBookCharterAndExcursionSplit', () => {
  it('calculates multi-tier charter base fee and opt-in excursion module proration correctly', () => {
    const result = calculateCoBookCharterAndExcursionSplit({
      charterBaseFeeUsd: 1200,
      sharedFuelAndPermitsUsd: 300,
      excursionModules: [
        { moduleId: 'scuba', moduleName: 'Scuba Diving', additionalCostUsd: 400, participantIds: ['Alice', 'Bob'] },
        { moduleId: 'wine-tasting', moduleName: 'VIP Wine Tasting', additionalCostUsd: 150, participantIds: ['Charlie', 'David'] }
      ],
      allGroupMembers: ['Alice', 'Bob', 'Charlie', 'David', 'Eve']
    });

    expect(result.valid).toBe(true);
    expect(result.totalGroupSize).toBe(5);
    expect(result.baseSharedPerPersonUsd).toBe(300); // (1200 + 300) / 5
    expect(result.grandTotalExcursionCostUsd).toBe(2050); // 1500 base + 400 scuba + 150 wine
    expect(result.splitTierStatus).toBe('MULTI_TIER_OPT_IN_EXCURSION_PRORATION');

    const alice = result.participantBreakdown?.find(p => p.memberId === 'Alice');
    expect(alice?.optInModulesCostUsd).toBe(200); // 400 / 2
    expect(alice?.totalMemberCostUsd).toBe(500); // 300 base + 200 scuba

    const eve = result.participantBreakdown?.find(p => p.memberId === 'Eve');
    expect(eve?.optInModulesCostUsd).toBe(0);
    expect(eve?.totalMemberCostUsd).toBe(300); // 300 base only
  });

  it('handles uniform charter split when no add-on modules are present', () => {
    const result = calculateCoBookCharterAndExcursionSplit({
      charterBaseFeeUsd: 1000,
      sharedFuelAndPermitsUsd: 200,
      excursionModules: [],
      allGroupMembers: ['Alice', 'Bob', 'Charlie', 'David']
    });

    expect(result.valid).toBe(true);
    expect(result.splitTierStatus).toBe('UNIFORM_CHARTER_SPLIT');
    expect(result.baseSharedPerPersonUsd).toBe(300); // 1200 / 4
    expect(result.grandTotalExcursionCostUsd).toBe(1200);
  });

  it('handles invalid input gracefully', () => {
    const result = calculateCoBookCharterAndExcursionSplit({ charterBaseFeeUsd: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Charter base fee must be a positive number');
  });
});
