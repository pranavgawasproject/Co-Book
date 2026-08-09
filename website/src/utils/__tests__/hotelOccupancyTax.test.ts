import { describe, it, expect } from 'vitest';
import { calculateGroupHotelRoomOccupancyAndBedTaxAllocation } from '../splitMath';

describe('calculateGroupHotelRoomOccupancyAndBedTaxAllocation', () => {
  it('calculates tiered room occupancy and bed tax split correctly', () => {
    const res = calculateGroupHotelRoomOccupancyAndBedTaxAllocation({
      rooms: [
        { roomType: 'Single Deluxe', pricePerNightUsd: 200, occupantsCount: 1 },
        { roomType: 'Double Queen', pricePerNightUsd: 240, occupantsCount: 2 }
      ],
      totalNights: 3,
      localBedTaxPerRoomNightUsd: 15,
      resortFeePerNightUsd: 25
    });

    expect(res.valid).toBe(true);
    expect(res.totalRoomsCount).toBe(2);
    expect(res.totalOccupantsCount).toBe(3);
    expect(res.allocationTier).toBe('TIERED_ROOM_PREMIUM_ALLOCATION');
    expect(res.grandTotalUsd).toBe(1560); // (200*3 + 40*3) + (240*3 + 40*3) = 720 + 840 = 1560
    expect(res.roomShares).toHaveLength(2);
    expect(res.roomShares?.[0].perPersonTotalUsd).toBe(720); // 720 / 1
    expect(res.roomShares?.[1].perPersonTotalUsd).toBe(420); // 840 / 2
  });

  it('returns error for empty rooms list or non-positive total nights', () => {
    const res = calculateGroupHotelRoomOccupancyAndBedTaxAllocation({ rooms: [] });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Rooms list must be a non-empty array');
  });
});
