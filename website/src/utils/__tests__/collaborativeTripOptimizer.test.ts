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
});
