import { describe, it, expect } from 'vitest';
import { calculateGroupVehicleFuelAndTollSplit } from '../splitMath';

describe('calculateGroupVehicleFuelAndTollSplit', () => {
  it('calculates equal fuel and toll split across participants', () => {
    const result = calculateGroupVehicleFuelAndTollSplit({
      expensesList: [
        { description: 'Gas Station Refill', amountUsd: 60, paidByMemberName: 'Alex' },
        { description: 'Highway Toll', amountUsd: 20, paidByMemberName: 'Alex' }
      ],
      allParticipantsList: ['Alex', 'Ben', 'Chris', 'David']
    });

    expect(result.valid).toBe(true);
    expect(result.totalExpensesUsd).toBe(80);
    expect(result.participantsCount).toBe(4);
    expect(result.splitTier).toBe('EQUAL_ROAD_TRIP_FUEL_SPLIT');
    expect(result.participantShareBreakdown).toHaveLength(4);

    const alex = result.participantShareBreakdown?.find(p => p.name === 'Alex');
    expect(alex?.paidUsd).toBe(80);
    expect(alex?.allocatedExpenseShareUsd).toBe(20);
    expect(alex?.netOwedUsd).toBe(-60); // Owed refund of $60
  });

  it('calculates distance-weighted leg proration for partial passengers', () => {
    const result = calculateGroupVehicleFuelAndTollSplit({
      totalFuelAndTollExpensesUsd: 120,
      legsList: [
        { legName: 'Leg 1: City to Mountain', distanceMiles: 100, participantsOnLeg: ['Alex', 'Ben'] },
        { legName: 'Leg 2: Mountain Trail', distanceMiles: 100, participantsOnLeg: ['Alex', 'Ben', 'Chris'] }
      ],
      allParticipantsList: ['Alex', 'Ben', 'Chris']
    });

    expect(result.valid).toBe(true);
    expect(result.totalExpensesUsd).toBe(120);
    expect(result.splitTier).toBe('DISTANCE_WEIGHTED_LEG_PRORATION');

    const chris = result.participantShareBreakdown?.find(p => p.name === 'Chris');
    expect(chris?.passengerMiles).toBe(100);
  });

  it('handles invalid inputs gracefully', () => {
    const result = calculateGroupVehicleFuelAndTollSplit({ totalFuelAndTollExpensesUsd: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Total fuel/toll expenses must be greater than zero and participants list must not be empty');
  });
});
