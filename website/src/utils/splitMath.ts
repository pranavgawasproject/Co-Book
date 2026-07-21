/**
 * Safely convert dollar/rupee amount to total cents to avoid floating point precision issues.
 */
function toCents(amount: number): number {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Calculate equal expense split share for group members.
 * Returns base per-person share rounded to 2 decimal places and remainder.
 */
export function calculateEqualSplit(totalAmount: number, memberCount: number): {
  perPersonShare: number;
  remainderCents: number;
} {
  if (memberCount <= 0 || isNaN(memberCount) || !isFinite(memberCount) || totalAmount <= 0) {
    return { perPersonShare: 0, remainderCents: 0 };
  }

  const totalCents = toCents(totalAmount);
  const baseShareCents = Math.floor(totalCents / memberCount);
  const remainderCents = totalCents - baseShareCents * memberCount;

  return {
    perPersonShare: baseShareCents / 100,
    remainderCents: remainderCents / 100
  };
}

/**
 * Calculate individual member shares for equal splits, distributing remainder cents
 * so that sum(shares) equals totalAmount EXACTLY without cents losing/overcharging.
 */
export function calculateEqualShares(totalAmount: number, memberCount: number): number[] {
  if (memberCount <= 0 || isNaN(memberCount) || !isFinite(memberCount) || totalAmount <= 0) {
    return Array(Math.max(0, Math.floor(memberCount) || 0)).fill(0);
  }

  const totalCents = toCents(totalAmount);
  const count = Math.floor(memberCount);
  const baseShareCents = Math.floor(totalCents / count);
  let remainderCents = totalCents - baseShareCents * count;

  const sharesInCents: number[] = [];
  for (let i = 0; i < count; i++) {
    if (remainderCents > 0) {
      sharesInCents.push(baseShareCents + 1);
      remainderCents--;
    } else {
      sharesInCents.push(baseShareCents);
    }
  }

  return sharesInCents.map(c => c / 100);
}

/**
 * Calculate percentage-based expense split for group members.
 * @param totalAmount Total bill amount
 * @param percentages Array of percentage values for each participant (e.g., [50, 25, 25])
 * @param distributeRemainder If true, distributes leftover cents across initial shares so total sum matches totalAmount exactly.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: number[],
  distributeRemainder = true
): {
  shares: number[];
  remainderCents: number;
} {
  if (totalAmount <= 0 || !percentages || !percentages.length) {
    return { shares: (percentages || []).map(() => 0), remainderCents: 0 };
  }

  const totalCents = toCents(totalAmount);
  const validPcts = percentages.map(p => (isNaN(p) || !isFinite(p) ? 0 : Math.max(0, p)));
  const totalPct = validPcts.reduce((sum, p) => sum + p, 0);

  if (totalPct <= 0) {
    return { shares: percentages.map(() => 0), remainderCents: 0 };
  }

  let allocatedCents = 0;
  const sharesInCents = validPcts.map(pct => {
    const shareCents = Math.floor((totalCents * pct) / totalPct);
    allocatedCents += shareCents;
    return shareCents;
  });

  let remainderCents = totalCents - allocatedCents;

  if (distributeRemainder && remainderCents > 0) {
    for (let i = 0; i < sharesInCents.length && remainderCents > 0; i++) {
      if (validPcts[i] > 0) {
        sharesInCents[i] += 1;
        remainderCents -= 1;
      }
    }
  }

  return {
    shares: sharesInCents.map(c => c / 100),
    remainderCents: remainderCents / 100
  };
}

/**
 * Calculate weighted expense split for group members.
 * @param totalAmount Total bill amount
 * @param weights Array of relative weights for each participant (e.g., [2, 1, 1])
 * @param distributeRemainder If true, distributes leftover cents across initial shares.
 */
export function calculateWeightedSplit(
  totalAmount: number,
  weights: number[],
  distributeRemainder = true
): {
  shares: number[];
  remainderCents: number;
} {
  if (totalAmount <= 0 || !weights || !weights.length) {
    return { shares: (weights || []).map(() => 0), remainderCents: 0 };
  }

  const validWeights = weights.map(w => (isNaN(w) || !isFinite(w) ? 0 : Math.max(0, w)));
  const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    return { shares: weights.map(() => 0), remainderCents: 0 };
  }

  const percentages = validWeights.map(w => (w / totalWeight) * 100);
  return calculatePercentageSplit(totalAmount, percentages, distributeRemainder);
}

/**
 * Map default currency to appropriate Intl locale if not specified.
 */
function getDefaultLocale(currency: string): string {
  const code = currency.toUpperCase();
  switch (code) {
    case 'INR':
      return 'en-IN';
    case 'EUR':
      return 'de-DE';
    case 'GBP':
      return 'en-GB';
    case 'JPY':
      return 'ja-JP';
    case 'CAD':
      return 'en-CA';
    case 'AUD':
      return 'en-AU';
    case 'USD':
    default:
      return 'en-US';
  }
}

/**
 * Format currency amounts with smart locale defaults and edge case fallback.
 */
export function formatCurrency(amount: number, currency = 'USD', locale?: string): string {
  const numericAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  const targetLocale = locale || getDefaultLocale(currency);

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toUpperCase() === 'JPY' ? 0 : 2
    }).format(numericAmount);
  } catch (_) {
    // Fallback in case of custom/unsupported currency codes
    const symbol = currency.toUpperCase() === 'INR' ? '₹' : '$';
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
}

export function calculateMultiCurrencyConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number> = {}
): number {
  if (isNaN(amount) || amount <= 0 || !fromCurrency || !toCurrency) return 0;
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;

  // Defaults relative to USD
  const defaultRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.78,
    INR: 83.5,
    JPY: 155.0,
    CAD: 1.36,
    AUD: 1.50
  };

  const rates = { ...defaultRates, ...exchangeRates };
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) return 0;
  const amountInUSD = amount / fromRate;
  const converted = amountInUSD * toRate;
  return Math.round(converted * 100) / 100;
}

export interface SimplifiedTransaction {
  from: string;
  to: string;
  amount: number;
}

export function simplifyGroupBalances(
  netBalances: { member: string; netAmount: number }[]
): SimplifiedTransaction[] {
  if (!Array.isArray(netBalances) || netBalances.length === 0) return [];

  const debtors: { member: string; amount: number }[] = [];
  const creditors: { member: string; amount: number }[] = [];

  for (const item of netBalances) {
    const rounded = Math.round(item.netAmount * 100) / 100;
    if (rounded < 0) {
      debtors.push({ member: item.member, amount: Math.abs(rounded) });
    } else if (rounded > 0) {
      creditors.push({ member: item.member, amount: rounded });
    }
  }

  const transactions: SimplifiedTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settlement = Math.min(debtor.amount, creditor.amount);

    if (settlement > 0) {
      transactions.push({
        from: debtor.member,
        to: creditor.member,
        amount: Math.round(settlement * 100) / 100
      });
    }

    debtor.amount -= settlement;
    creditor.amount -= settlement;

    if (Math.round(debtor.amount * 100) === 0) i++;
    if (Math.round(creditor.amount * 100) === 0) j++;
  }

  return transactions;
}

export function validateGroupSplitInput(totalAmount: number, memberNames: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
    errors.push('Total amount must be greater than zero');
  }
  if (!Array.isArray(memberNames) || memberNames.length < 2) {
    errors.push('At least two group members are required to split');
  } else {
    const emptyNames = memberNames.filter(n => !n || !n.trim());
    if (emptyNames.length > 0) {
      errors.push('Member names cannot be empty');
    }
  }
  return { isValid: errors.length === 0, errors };
}

export function calculateTipAndTaxDistributions(
  baseAmount: number,
  taxAmount: number,
  tipAmount: number,
  memberShares: number[]
): { sharesWithTaxTip: number[]; total: number } {
  if (baseAmount <= 0 || !Array.isArray(memberShares) || memberShares.length === 0) {
    return { sharesWithTaxTip: (memberShares || []).map(() => 0), total: 0 };
  }
  const tax = Math.max(0, isNaN(taxAmount) ? 0 : taxAmount);
  const tip = Math.max(0, isNaN(tipAmount) ? 0 : tipAmount);
  const totalBill = baseAmount + tax + tip;
  const ratio = totalBill / baseAmount;

  const sharesWithTaxTip = memberShares.map(share => {
    const s = Math.max(0, isNaN(share) ? 0 : share);
    return Math.round(s * ratio * 100) / 100;
  });

  const total = Math.round(totalBill * 100) / 100;
  return { sharesWithTaxTip, total };
}

export function generateCollaborativeSessionToken(tripId: string, userId: string): string {
  if (!tripId || !userId || typeof tripId !== 'string' || typeof userId !== 'string') {
    return '';
  }
  const cleanTrip = tripId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUser = userId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTrip || !cleanUser) return '';
  return `sync_${cleanTrip}_${cleanUser}`;
}

export function calculateCategorySpendingBreakdown(
  expenses: Array<{ category?: string; amount?: number }>
): Record<string, number> {
  if (!Array.isArray(expenses)) return {};
  const breakdown: Record<string, number> = {};

  for (const exp of expenses) {
    if (!exp) continue;
    const cat = (exp.category && exp.category.trim()) || 'General';
    const amt = typeof exp.amount === 'number' && !isNaN(exp.amount) && exp.amount > 0 ? exp.amount : 0;
    breakdown[cat] = Math.round(((breakdown[cat] || 0) + amt) * 100) / 100;
  }

  return breakdown;
}

export function calculateBudgetPerPersonCap(
  totalBudget: number,
  memberCount: number,
  maxCapPerPerson?: number
): { perPersonBudget: number; exceedsCap: boolean; excessPerPerson: number } {
  if (typeof totalBudget !== 'number' || isNaN(totalBudget) || totalBudget <= 0 ||
      typeof memberCount !== 'number' || isNaN(memberCount) || memberCount <= 0) {
    return { perPersonBudget: 0, exceedsCap: false, excessPerPerson: 0 };
  }

  const perPersonBudget = Math.round((totalBudget / memberCount) * 100) / 100;
  if (typeof maxCapPerPerson !== 'number' || isNaN(maxCapPerPerson) || maxCapPerPerson <= 0) {
    return { perPersonBudget, exceedsCap: false, excessPerPerson: 0 };
  }

  const exceedsCap = perPersonBudget > maxCapPerPerson;
  const excessPerPerson = exceedsCap ? Math.round((perPersonBudget - maxCapPerPerson) * 100) / 100 : 0;

  return { perPersonBudget, exceedsCap, excessPerPerson };
}

export function calculateGroupBudgetVelocity(
  expenses: Array<{ amount?: number }>,
  totalBudget: number,
  elapsedDays: number,
  totalTripDays: number
): {
  dailyBurnRate: number;
  projectedTotalSpend: number;
  isOverBudget: boolean;
  budgetUtilizationPercentage: number;
} {
  if (
    !Array.isArray(expenses) ||
    typeof totalBudget !== 'number' ||
    isNaN(totalBudget) ||
    totalBudget <= 0 ||
    typeof elapsedDays !== 'number' ||
    isNaN(elapsedDays) ||
    elapsedDays <= 0 ||
    typeof totalTripDays !== 'number' ||
    isNaN(totalTripDays) ||
    totalTripDays <= 0
  ) {
    return {
      dailyBurnRate: 0,
      projectedTotalSpend: 0,
      isOverBudget: false,
      budgetUtilizationPercentage: 0
    };
  }

  const totalSpent = expenses.reduce((sum, exp) => {
    const amt = typeof exp?.amount === 'number' && !isNaN(exp.amount) && exp.amount > 0 ? exp.amount : 0;
    return sum + amt;
  }, 0);

  const dailyBurnRate = Math.round((totalSpent / elapsedDays) * 100) / 100;
  const projectedTotalSpend = Math.round(dailyBurnRate * totalTripDays * 100) / 100;
  const isOverBudget = projectedTotalSpend > totalBudget;
  const budgetUtilizationPercentage = Math.round((totalSpent / totalBudget) * 100 * 10) / 10;

  return {
    dailyBurnRate,
    projectedTotalSpend,
    isOverBudget,
    budgetUtilizationPercentage
  };
}

export function calculateGroupSettleUpPlan(
  balances: Record<string, number>
): { transactions: SimplifiedTransaction[]; totalVolume: number; isSettled: boolean } {
  if (!balances || typeof balances !== 'object') {
    return { transactions: [], totalVolume: 0, isSettled: true };
  }

  const netBalances = Object.entries(balances).map(([member, netAmount]) => ({
    member,
    netAmount: typeof netAmount === 'number' && !isNaN(netAmount) ? netAmount : 0
  }));

  const transactions = simplifyGroupBalances(netBalances);
  const totalVolume = Math.round(
    transactions.reduce((sum, tx) => sum + tx.amount, 0) * 100
  ) / 100;

  return {
    transactions,
    totalVolume,
    isSettled: transactions.length === 0
  };
}

export function calculateGroupExpenseFairnessIndex(
  balances: Record<string, number>
): {
  fairnessScore: number;
  rating: 'Highly Balanced' | 'Slightly Disproportionate' | 'Highly Unbalanced';
  topPayer: string;
  topOwer: string;
} {
  const entries = Object.entries(balances || {});
  if (entries.length === 0) {
    return { fairnessScore: 100, rating: 'Highly Balanced', topPayer: '', topOwer: '' };
  }

  let maxNet = -Infinity;
  let minNet = Infinity;
  let topPayer = '';
  let topOwer = '';
  let totalAbsNet = 0;

  for (const [member, net] of entries) {
    const val = typeof net === 'number' && !isNaN(net) ? net : 0;
    totalAbsNet += Math.abs(val);
    if (val > maxNet) {
      maxNet = val;
      topPayer = member;
    }
    if (val < minNet) {
      minNet = val;
      topOwer = member;
    }
  }

  // Calculate fairness index based on total imbalance relative to group size
  const avgImbalancePerPerson = totalAbsNet / entries.length;
  const rawScore = Math.max(0, 100 - Math.round(avgImbalancePerPerson * 0.5));
  const fairnessScore = Math.min(100, rawScore);

  let rating: 'Highly Balanced' | 'Slightly Disproportionate' | 'Highly Unbalanced' = 'Highly Balanced';
  if (fairnessScore < 60) {
    rating = 'Highly Unbalanced';
  } else if (fairnessScore < 85) {
    rating = 'Slightly Disproportionate';
  }

  return {
    fairnessScore,
    rating,
    topPayer: maxNet > 0 ? topPayer : '',
    topOwer: minNet < 0 ? topOwer : ''
  };
}









