import { describe, test, expect } from 'vitest';
import { calculateCollaborativeTripOptimization } from '../collaborativeTripOptimizer';

describe('collaborativeTripOptimizer', () => {
  test('calculates affordable trip optimization correctly', () => {
    const result = calculateCollaborativeTripOptimization({
      members: [
        { userId: '1', name: 'Alice', maxBudgetUsd: 1000 },
        { userId: '2', name: 'Bob', maxBudgetUsd: 1200 },
        { userId: '3', name: 'Charlie', maxBudgetUsd: 1500 }
      ],
      tripPackage: {
        packageId: 'pkg-1',
        title: 'Bali Getaway',
        totalFlightCost: 1500,
        totalHotelCost: 900,
        totalActivityCost: 300
      }
    });

    expect(result.totalGroupCost).toBe(2700);
    expect(result.perPersonCost).toBe(900);
    expect(result.isWithinAllBudgets).toBe(true);
    expect(result.consensusScore).toBe(100);
    expect(result.budgetDeficitUsers.length).toBe(0);
    expect(result.perPersonBreakdown['1']).toBe(900);
  });

  test('flags budget deficit when package cost exceeds member budget', () => {
    const result = calculateCollaborativeTripOptimization({
      members: [
        { userId: '1', name: 'Alice', maxBudgetUsd: 800 },
        { userId: '2', name: 'Bob', maxBudgetUsd: 1200 }
      ],
      tripPackage: {
        packageId: 'pkg-2',
        title: 'Paris Explorer',
        totalFlightCost: 1200,
        totalHotelCost: 800,
        totalActivityCost: 0
      }
    });

    expect(result.perPersonCost).toBe(1000);
    expect(result.isWithinAllBudgets).toBe(false);
    expect(result.budgetDeficitUsers).toContain('Alice');
    expect(result.consensusScore).toBeLessThan(100);
  });

  test('applies single room premium correctly', () => {
    const result = calculateCollaborativeTripOptimization({
      members: [
        { userId: '1', name: 'Alice', maxBudgetUsd: 1500, preferredRoomType: 'SINGLE' },
        { userId: '2', name: 'Bob', maxBudgetUsd: 1200, preferredRoomType: 'SHARED' },
        { userId: '3', name: 'Charlie', maxBudgetUsd: 1500, preferredRoomType: 'SHARED' }
      ],
      tripPackage: {
        packageId: 'pkg-3',
        title: 'Tokyo Trip',
        totalFlightCost: 1500, // 500 each
        totalHotelCost: 1200,
        totalActivityCost: 300, // 100 each
        singleRoomPremium: 300
      }
    });

    // Total cost = 3000
    // Premium = 300
    // Base cost = 3000 - 300 = 2700
    // Base per person = 900
    // Alice = 900 + 300 = 1200
    // Bob = 900
    // Charlie = 900

    expect(result.totalGroupCost).toBe(3000);
    expect(result.perPersonBreakdown['1']).toBe(1200);
    expect(result.perPersonBreakdown['2']).toBe(900);
    expect(result.perPersonBreakdown['3']).toBe(900);
    expect(result.isWithinAllBudgets).toBe(true);
    expect(result.budgetDeficitUsers.length).toBe(0);
    expect(result.recommendations).toContain('Applied single room premium of $300.00 for 1 member(s).');
  });

  test('handles empty members correctly', () => {
    const result = calculateCollaborativeTripOptimization({
      members: [],
      tripPackage: {
        packageId: 'pkg-empty',
        title: 'Empty',
        totalFlightCost: 100,
        totalHotelCost: 100,
        totalActivityCost: 100
      }
    });
    expect(result.perPersonCost).toBe(0);
    expect(result.perPersonBreakdown).toEqual({});
  });
});
