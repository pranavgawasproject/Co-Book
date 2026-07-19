/**
 * Calculate equal expense split share for group members.
 * Returns individual share rounded to 2 decimal places and remainder.
 */
export function calculateEqualSplit(totalAmount: number, memberCount: number): {
  perPersonShare: number;
  remainderCents: number;
} {
  if (memberCount <= 0 || totalAmount <= 0) {
    return { perPersonShare: 0, remainderCents: 0 };
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseShareCents = Math.floor(totalCents / memberCount);
  const remainderCents = totalCents - baseShareCents * memberCount;

  return {
    perPersonShare: baseShareCents / 100,
    remainderCents: remainderCents / 100
  };
}

/**
 * Calculate percentage-based expense split for group members.
 * @param totalAmount Total bill amount
 * @param percentages Array of percentage values for each participant (e.g., [50, 25, 25])
 */
export function calculatePercentageSplit(totalAmount: number, percentages: number[]): {
  shares: number[];
  remainderCents: number;
} {
  if (totalAmount <= 0 || !percentages.length) {
    return { shares: [], remainderCents: 0 };
  }

  const totalCents = Math.round(totalAmount * 100);
  const totalPct = percentages.reduce((sum, p) => sum + Math.max(0, p), 0);
  if (totalPct <= 0) {
    return { shares: percentages.map(() => 0), remainderCents: 0 };
  }

  let allocatedCents = 0;
  const sharesInCents = percentages.map(pct => {
    const validPct = Math.max(0, pct);
    const shareCents = Math.floor((totalCents * validPct) / totalPct);
    allocatedCents += shareCents;
    return shareCents;
  });

  const remainderCents = totalCents - allocatedCents;
  return {
    shares: sharesInCents.map(c => c / 100),
    remainderCents: remainderCents / 100
  };
}

/**
 * Calculate weighted expense split for group members.
 * @param totalAmount Total bill amount
 * @param weights Array of relative weights for each participant (e.g., [2, 1, 1])
 */
export function calculateWeightedSplit(totalAmount: number, weights: number[]): {
  shares: number[];
  remainderCents: number;
} {
  if (totalAmount <= 0 || !weights.length) {
    return { shares: [], remainderCents: 0 };
  }

  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (totalWeight <= 0) {
    return { shares: weights.map(() => 0), remainderCents: 0 };
  }

  const percentages = weights.map(w => (Math.max(0, w) / totalWeight) * 100);
  return calculatePercentageSplit(totalAmount, percentages);
}

/**
 * Format currency amounts nicely.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

