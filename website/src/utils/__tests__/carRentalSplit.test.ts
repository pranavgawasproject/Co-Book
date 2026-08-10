import { describe, test, expect } from 'vitest';
import { calculateGroupCarRentalAndVehicleInsuranceTaxSplit } from '../splitMath';

describe('calculateGroupCarRentalAndVehicleInsuranceTaxSplit', () => {
  test('calculates car rental split with designated driver insurance surcharge correctly', () => {
    const res = calculateGroupCarRentalAndVehicleInsuranceTaxSplit({
      rentalBaseCostUsd: 400,
      insuranceCoverageCostUsd: 120,
      designatedDriversCount: 2,
      totalParticipantsCount: 4,
      fuelTotalCostUsd: 80,
      tollsTotalCostUsd: 40
    });

    expect(res.valid).toBe(true);
    expect(res.totalVehicleExpensesUsd).toBe(640);
    expect(res.perNonDriverShareUsd).toBe(130); // (400+80+40)/4 = 130
    expect(res.driverInsuranceSurchargePerPersonUsd).toBe(60); // 120 / 2 = 60
    expect(res.perDriverShareUsd).toBe(190); // 130 + 60 = 190
    expect(res.allocationTier).toBe('EQUAL_DRIVER_SURCHARGE_ALLOCATION');
  });

  test('calculates equal split when all participants are designated drivers', () => {
    const res = calculateGroupCarRentalAndVehicleInsuranceTaxSplit({
      rentalBaseCostUsd: 300,
      insuranceCoverageCostUsd: 60,
      designatedDriversCount: 3,
      totalParticipantsCount: 3,
      fuelTotalCostUsd: 60,
      tollsTotalCostUsd: 30
    });

    expect(res.valid).toBe(true);
    expect(res.perDriverShareUsd).toBe(150); // (300+60+60+30)/3 = 150
    expect(res.allocationTier).toBe('FULL_GROUP_DRIVER_EQUAL_SPLIT');
  });

  test('handles invalid inputs cleanly', () => {
    const res = calculateGroupCarRentalAndVehicleInsuranceTaxSplit({
      rentalBaseCostUsd: -100
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe('Rental base cost must be a positive number');
  });
});
