import { describe, it, expect } from 'vitest';
import { calculateGroupDiningAndTipSplitting } from '../splitMath';

describe('calculateGroupDiningAndTipSplitting', () => {
  it('calculates proportional itemized split for group dining with tax and tip', () => {
    const result = calculateGroupDiningAndTipSplitting({
      items: [
        { itemName: 'Shared Appetizer', itemCostUsd: 30, consumedBy: ['Alice', 'Bob', 'Charlie'] },
        { itemName: 'Steak & Wine', itemCostUsd: 45, consumedBy: ['Alice'] },
        { itemName: 'Vegan Pasta & Juice', itemCostUsd: 25, consumedBy: ['Bob'] },
        { itemName: 'Salad', itemCostUsd: 20, consumedBy: ['Charlie'] }
      ],
      taxRatePct: 10,
      tipRatePct: 20,
      paidByMemberName: 'Alice'
    });

    expect(result.valid).toBe(true);
    expect(result.subtotalUsd).toBe(120);
    expect(result.taxAmountUsd).toBe(12);
    expect(result.tipAmountUsd).toBe(24);
    expect(result.grandTotalUsd).toBe(156);
    expect(result.memberBreakdown).toHaveLength(3);

    // Total of all member shares should equal grandTotalUsd (156)
    const totalShares = result.memberBreakdown?.reduce((sum, m) => sum + m.totalShareUsd, 0);
    expect(Math.round((totalShares || 0) * 100) / 100).toBe(156);
    expect(result.splitTier).toBe('PROPORTIONAL_ITEMIZED_DINING_SPLIT');
  });

  it('handles single payer dining bill cleanly', () => {
    const result = calculateGroupDiningAndTipSplitting({
      items: [
        { itemName: 'Solo Lunch', itemCostUsd: 50, consumedBy: ['Dave'] }
      ],
      taxRatePct: 8,
      tipRatePct: 15
    });

    expect(result.valid).toBe(true);
    expect(result.subtotalUsd).toBe(50);
    expect(result.splitTier).toBe('SINGLE_PAYER_FULL_COVERAGE');
  });

  it('handles invalid inputs gracefully', () => {
    const result = calculateGroupDiningAndTipSplitting({ items: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Items list must be a non-empty array');
  });
});
