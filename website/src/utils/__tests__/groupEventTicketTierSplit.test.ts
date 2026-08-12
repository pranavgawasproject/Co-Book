import { describe, test, expect } from 'vitest';
import { calculateCoBookGroupEventTicketAndVipTierSplit } from '../splitMath';

describe('calculateCoBookGroupEventTicketAndVipTierSplit', () => {
  test('calculates tiered VIP and General Admission ticket split correctly', () => {
    const res = calculateCoBookGroupEventTicketAndVipTierSplit({
      baseGeneralAdmissionPriceUsd: 120,
      vipUpgradePassFeeUsd: 150,
      totalGroupSize: 6,
      vipPassCount: 2,
      sharedGroupServiceFeeUsd: 60
    });

    expect(res.valid).toBe(true);
    expect(res.splitTierStatus).toBe('TIERED_VIP_AND_GENERAL_ADMISSION_PRORATION');
    expect(res.perPersonServiceFeeUsd).toBe(10);
    expect(res.generalMemberShareUsd).toBe(130); // 120 + 10 = 130
    expect(res.vipMemberShareUsd).toBe(280); // 130 + 150 = 280
    expect(res.totalGroupEventCostUsd).toBe(1080); // 4 * 130 + 2 * 280 = 520 + 560 = 1080
  });

  test('calculates uniform General Admission split when VIP pass count is 0', () => {
    const res = calculateCoBookGroupEventTicketAndVipTierSplit({
      baseGeneralAdmissionPriceUsd: 100,
      totalGroupSize: 4,
      vipPassCount: 0,
      sharedGroupServiceFeeUsd: 40
    });

    expect(res.valid).toBe(true);
    expect(res.splitTierStatus).toBe('UNIFORM_GENERAL_ADMISSION_SPLIT');
    expect(res.generalMemberShareUsd).toBe(110);
    expect(res.totalGroupEventCostUsd).toBe(440);
  });

  test('returns error for invalid group size or negative ticket price', () => {
    const res = calculateCoBookGroupEventTicketAndVipTierSplit({
      baseGeneralAdmissionPriceUsd: -50,
      totalGroupSize: 0
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });
});
