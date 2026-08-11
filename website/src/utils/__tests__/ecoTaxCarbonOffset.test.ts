import { describe, it, expect } from 'vitest';
import { calculateGroupTripEcoTaxAndCarbonOffsetAllocation } from '../splitMath';

describe('calculateGroupTripEcoTaxAndCarbonOffsetAllocation', () => {
  it('calculates carbon offset and destination eco-tax allocation for group travelers correctly', () => {
    const result = calculateGroupTripEcoTaxAndCarbonOffsetAllocation({
      travelersList: [
        { name: 'Alice', flightOptIn: true, flightClassMultiplier: 1.0, lodgingShareFraction: 0.5 },
        { name: 'Bob', flightOptIn: true, flightClassMultiplier: 1.8, lodgingShareFraction: 0.5 } // Business class flight
      ],
      flightDistanceKm: 2000,
      lodgingNightsCount: 5,
      vehicleDistanceKm: 300,
      carbonOffsetRatePerTonUsd: 30,
      destinationEcoTaxPerNightUsd: 4.0
    });

    expect(result.valid).toBe(true);
    expect(result.travelersCount).toBe(2);
    expect(result.totalGroupEmissionsKgCo2).toBeGreaterThan(0);
    expect(result.totalDestinationEcoTaxUsd).toBe(20.0); // 5 nights * $4.0 = $20 total
    expect(result.participantBreakdown).toHaveLength(2);
    expect(result.participantBreakdown[1].personalTotalEmissionsKg).toBeGreaterThan(result.participantBreakdown[0].personalTotalEmissionsKg);
  });

  it('handles empty input validation cleanly', () => {
    const result = calculateGroupTripEcoTaxAndCarbonOffsetAllocation({
      travelersList: []
    });

    expect(result.valid).toBe(false);
    expect(result.sustainabilityTier).toBe('NO_TRAVELERS_SUBMITTED');
  });

  it('correctly categorizes low carbon footprint eco leaders', () => {
    const result = calculateGroupTripEcoTaxAndCarbonOffsetAllocation({
      travelersList: [
        { name: 'Charlie', flightOptIn: false, lodgingShareFraction: 1.0 } // Train / train transit, no flight
      ],
      flightDistanceKm: 0,
      lodgingNightsCount: 2,
      vehicleDistanceKm: 50
    });

    expect(result.valid).toBe(true);
    expect(result.sustainabilityTier).toBe('ECO_LEADER_LOW_CARBON');
  });
});
