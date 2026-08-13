import { describe, test, expect } from 'vitest';
import { calculateGroupVacationRentalRoomTierSplit } from '../splitMath';

describe('calculateGroupVacationRentalRoomTierSplit', () => {
  test('calculates room-tier weighted allocation correctly for villa rental', () => {
    const res = calculateGroupVacationRentalRoomTierSplit({
      totalRentalCostUsd: 2000,
      taxAndCleaningFeeUsd: 300,
      rooms: [
        { roomId: 'master-suite', roomName: 'Master Suite', tierMultiplier: 1.5, occupantIds: ['Alice', 'Bob'] },
        { roomId: 'bedroom-2', roomName: 'En-Suite Bedroom', tierMultiplier: 1.2, occupantIds: ['Charlie'] },
        { roomId: 'bedroom-3', roomName: 'Standard Bedroom', tierMultiplier: 1.0, occupantIds: ['David', 'Eve'] }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.totalGroupCostUsd).toBe(2300);
    expect(res.roomShares?.length).toBe(3);
    expect(res.occupantShares?.Alice).toBeGreaterThan(0);
    expect(res.occupantShares?.Charlie).toBeGreaterThan(res.occupantShares?.David!);
  });

  test('handles equal room multipliers correctly', () => {
    const res = calculateGroupVacationRentalRoomTierSplit({
      totalRentalCostUsd: 1000,
      taxAndCleaningFeeUsd: 0,
      rooms: [
        { roomId: 'room-1', roomName: 'Room 1', tierMultiplier: 1.0, occupantIds: ['Alice'] },
        { roomId: 'room-2', roomName: 'Room 2', tierMultiplier: 1.0, occupantIds: ['Bob'] }
      ]
    });

    expect(res.valid).toBe(true);
    expect(res.occupantShares?.Alice).toBe(500);
    expect(res.occupantShares?.Bob).toBe(500);
  });

  test('returns error for invalid rental cost or empty rooms list', () => {
    const res = calculateGroupVacationRentalRoomTierSplit({
      totalRentalCostUsd: -500,
      rooms: []
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });
});
