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

export function calculateGroupDepositEscrowShares(
  expenses: Array<{ amount?: number }>,
  depositTotal: number,
  memberCount: number
): {
  perPersonDeposit: number;
  totalDeposit: number;
  remainingRefundablePerPerson: number;
  deductedDamagePerPerson: number;
} {
  if (
    typeof depositTotal !== 'number' ||
    isNaN(depositTotal) ||
    depositTotal <= 0 ||
    typeof memberCount !== 'number' ||
    isNaN(memberCount) ||
    memberCount <= 0
  ) {
    return { perPersonDeposit: 0, totalDeposit: 0, remainingRefundablePerPerson: 0, deductedDamagePerPerson: 0 };
  }

  const perPersonDeposit = Math.round((depositTotal / memberCount) * 100) / 100;
  const totalDamages = (Array.isArray(expenses) ? expenses : []).reduce((sum, exp) => {
    const amt = typeof exp?.amount === 'number' && !isNaN(exp.amount) && exp.amount > 0 ? exp.amount : 0;
    return sum + amt;
  }, 0);

  const damagePerPerson = Math.min(perPersonDeposit, Math.round((totalDamages / memberCount) * 100) / 100);
  const remainingRefundablePerPerson = Math.max(0, Math.round((perPersonDeposit - damagePerPerson) * 100) / 100);

  return {
    perPersonDeposit,
    totalDeposit: Math.round(depositTotal * 100) / 100,
    remainingRefundablePerPerson,
    deductedDamagePerPerson: damagePerPerson
  };
}

export function calculateGroupFlightSeatUpgradeShare(
  baseFlightTotal: number,
  upgradeFeeTotal: number,
  totalMembers: number,
  upgradedMemberCount: number
): {
  basePerPerson: number;
  upgradedPerPerson: number;
  totalFlightCost: number;
} {
  if (
    typeof baseFlightTotal !== 'number' || isNaN(baseFlightTotal) || baseFlightTotal <= 0 ||
    typeof totalMembers !== 'number' || isNaN(totalMembers) || totalMembers <= 0
  ) {
    return { basePerPerson: 0, upgradedPerPerson: 0, totalFlightCost: 0 };
  }

  const basePerPerson = Math.round((baseFlightTotal / totalMembers) * 100) / 100;
  const upgradeFee = typeof upgradeFeeTotal === 'number' && !isNaN(upgradeFeeTotal) && upgradeFeeTotal > 0 ? upgradeFeeTotal : 0;
  const optInCount = typeof upgradedMemberCount === 'number' && upgradedMemberCount > 0 ? Math.min(upgradedMemberCount, totalMembers) : 0;

  const upgradePerOptIn = optInCount > 0 ? Math.round((upgradeFee / optInCount) * 100) / 100 : 0;
  const upgradedPerPerson = Math.round((basePerPerson + upgradePerOptIn) * 100) / 100;

  return {
    basePerPerson,
    upgradedPerPerson,
    totalFlightCost: Math.round((baseFlightTotal + upgradeFee) * 100) / 100
  };
}

export function calculateTripCurrencyConversionRate(
  amount: number,
  exchangeRate: number,
  platformFeePercentage: number = 0
): {
  convertedAmount: number;
  platformFeeAmount: number;
  finalTotal: number;
} {
  if (
    typeof amount !== 'number' || isNaN(amount) || amount <= 0 ||
    typeof exchangeRate !== 'number' || isNaN(exchangeRate) || exchangeRate <= 0
  ) {
    return { convertedAmount: 0, platformFeeAmount: 0, finalTotal: 0 };
  }

  const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;
  const feeRate = typeof platformFeePercentage === 'number' && platformFeePercentage > 0 ? platformFeePercentage / 100 : 0;
  const platformFeeAmount = Math.round(convertedAmount * feeRate * 100) / 100;
  const finalTotal = Math.round((convertedAmount + platformFeeAmount) * 100) / 100;

  return {
    convertedAmount,
    platformFeeAmount,
    finalTotal
  };
}

export function calculateGroupCustomRatioSplit(
  totalAmount: number,
  ratios: number[]
): { shares: number[]; remainderCents: number } {
  if (totalAmount <= 0 || !Array.isArray(ratios) || ratios.length === 0) {
    return { shares: (ratios || []).map(() => 0), remainderCents: 0 };
  }

  const validRatios = ratios.map(r => (isNaN(r) || !isFinite(r) ? 0 : Math.max(0, r)));
  const totalRatio = validRatios.reduce((sum, r) => sum + r, 0);

  if (totalRatio <= 0) {
    return { shares: ratios.map(() => 0), remainderCents: 0 };
  }

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCents = 0;
  const sharesInCents = validRatios.map(r => {
    const cents = Math.floor((totalCents * r) / totalRatio);
    allocatedCents += cents;
    return cents;
  });

  let remainderCents = totalCents - allocatedCents;
  for (let i = 0; i < sharesInCents.length && remainderCents > 0; i++) {
    if (validRatios[i] > 0) {
      sharesInCents[i] += 1;
      remainderCents -= 1;
    }
  }

  return {
    shares: sharesInCents.map(c => c / 100),
    remainderCents: remainderCents / 100
  };
}

export function calculateCoBookingDiscountShare(
  totalOrderAmount: number,
  discountPercentage: number,
  participantCount: number
): {
  valid: boolean;
  totalOrderAmount: number;
  totalDiscountAmount: number;
  netOrderAmount: number;
  perPersonOriginalShare: number;
  perPersonDiscountShare: number;
  perPersonNetPayable: number;
} {
  if (
    typeof totalOrderAmount !== 'number' || isNaN(totalOrderAmount) || totalOrderAmount <= 0 ||
    typeof participantCount !== 'number' || isNaN(participantCount) || participantCount <= 0
  ) {
    return {
      valid: false,
      totalOrderAmount: 0,
      totalDiscountAmount: 0,
      netOrderAmount: 0,
      perPersonOriginalShare: 0,
      perPersonDiscountShare: 0,
      perPersonNetPayable: 0
    };
  }

  const pct = typeof discountPercentage === 'number' && !isNaN(discountPercentage) ? Math.max(0, Math.min(100, discountPercentage)) : 0;
  const count = Math.max(1, Math.floor(participantCount));

  const totalDiscountAmount = Math.round((totalOrderAmount * (pct / 100)) * 100) / 100;
  const netOrderAmount = Math.round((totalOrderAmount - totalDiscountAmount) * 100) / 100;

  const perPersonOriginalShare = Math.round((totalOrderAmount / count) * 100) / 100;
  const perPersonDiscountShare = Math.round((totalDiscountAmount / count) * 100) / 100;
  const perPersonNetPayable = Math.round((netOrderAmount / count) * 100) / 100;

  return {
    valid: true,
    totalOrderAmount,
    totalDiscountAmount,
    netOrderAmount,
    perPersonOriginalShare,
    perPersonDiscountShare,
    perPersonNetPayable
  };
}

export function calculateGroupFlightVsHotelSplitRatio(
  flightTotal: number,
  hotelTotal: number,
  participantCount: number
): {
  valid: boolean;
  totalBookingCost: number;
  flightPercentage: number;
  hotelPercentage: number;
  perPersonFlightShare: number;
  perPersonHotelShare: number;
  perPersonTotalShare: number;
} {
  const flight = typeof flightTotal === 'number' && !isNaN(flightTotal) && flightTotal >= 0 ? flightTotal : 0;
  const hotel = typeof hotelTotal === 'number' && !isNaN(hotelTotal) && hotelTotal >= 0 ? hotelTotal : 0;
  const count = typeof participantCount === 'number' && !isNaN(participantCount) && participantCount > 0 ? Math.floor(participantCount) : 0;

  if (count === 0 || (flight === 0 && hotel === 0)) {
    return {
      valid: false,
      totalBookingCost: 0,
      flightPercentage: 0,
      hotelPercentage: 0,
      perPersonFlightShare: 0,
      perPersonHotelShare: 0,
      perPersonTotalShare: 0
    };
  }

  const totalBookingCost = Math.round((flight + hotel) * 100) / 100;
  const flightPercentage = Math.round((flight / totalBookingCost) * 100 * 100) / 100;
  const hotelPercentage = Math.round((hotel / totalBookingCost) * 100 * 100) / 100;

  const perPersonFlightShare = Math.round((flight / count) * 100) / 100;
  const perPersonHotelShare = Math.round((hotel / count) * 100) / 100;
  const perPersonTotalShare = Math.round((totalBookingCost / count) * 100) / 100;

  return {
    valid: true,
    totalBookingCost,
    flightPercentage,
    hotelPercentage,
    perPersonFlightShare,
    perPersonHotelShare,
    perPersonTotalShare
  };
}

export function calculateGroupTravelCurrencyConversionSplit(
  amountForeignCurrency: number,
  exchangeRate: number,
  serviceFeePercentage: number = 2.5,
  participantCount: number = 1
): {
  valid: boolean;
  totalHomeCurrencyAmount: number;
  totalFeeAmount: number;
  netPayableHomeCurrency: number;
  perPersonShareHomeCurrency: number;
} {
  const foreign = typeof amountForeignCurrency === 'number' && !isNaN(amountForeignCurrency) && amountForeignCurrency > 0 ? amountForeignCurrency : 0;
  const rate = typeof exchangeRate === 'number' && !isNaN(exchangeRate) && exchangeRate > 0 ? exchangeRate : 0;
  const feePct = typeof serviceFeePercentage === 'number' && !isNaN(serviceFeePercentage) && serviceFeePercentage >= 0 ? serviceFeePercentage : 2.5;
  const count = typeof participantCount === 'number' && !isNaN(participantCount) && participantCount > 0 ? Math.floor(participantCount) : 1;

  if (foreign === 0 || rate === 0) {
    return {
      valid: false,
      totalHomeCurrencyAmount: 0,
      totalFeeAmount: 0,
      netPayableHomeCurrency: 0,
      perPersonShareHomeCurrency: 0
    };
  }

  const baseConverted = foreign * rate;
  const fee = baseConverted * (feePct / 100);
  const totalHome = Math.round((baseConverted + fee) * 100) / 100;
  const perPerson = Math.round((totalHome / count) * 100) / 100;

  return {
    valid: true,
    totalHomeCurrencyAmount: Math.round(baseConverted * 100) / 100,
    totalFeeAmount: Math.round(fee * 100) / 100,
    netPayableHomeCurrency: totalHome,
    perPersonShareHomeCurrency: perPerson
  };
}

export function calculateMultiplayerSyncSessionState(
  participants: Array<{ id: string; name: string; isApproved?: boolean; isActive?: boolean }>,
  totalBookingAmount: number
): {
  valid: boolean;
  totalParticipants: number;
  activeCount: number;
  approvedCount: number;
  consensusPercentage: number;
  isReadyToBook: boolean;
  perParticipantShare: number;
} {
  if (!Array.isArray(participants) || participants.length === 0) {
    return {
      valid: false,
      totalParticipants: 0,
      activeCount: 0,
      approvedCount: 0,
      consensusPercentage: 0,
      isReadyToBook: false,
      perParticipantShare: 0
    };
  }

  const amount = typeof totalBookingAmount === 'number' && !isNaN(totalBookingAmount) && totalBookingAmount > 0 ? totalBookingAmount : 0;
  const total = participants.length;
  const activeCount = participants.filter(p => p && p.isActive !== false).length;
  const approvedCount = participants.filter(p => p && p.isApproved === true).length;
  const consensusPercentage = Math.round((approvedCount / total) * 100);
  const isReadyToBook = approvedCount === total && total > 0;
  const perParticipantShare = amount > 0 ? Math.round((amount / total) * 100) / 100 : 0;

  return {
    valid: true,
    totalParticipants: total,
    activeCount,
    approvedCount,
    consensusPercentage,
    isReadyToBook,
    perParticipantShare
  };
}

export function calculateGroupFlightPriceAlertThreshold(
  currentPricePerPerson: number,
  targetPricePerPerson: number,
  participantCount: number = 1
): {
  valid: boolean;
  currentTotal: number;
  targetTotal: number;
  potentialGroupSavings: number;
  discountPercentage: number;
  shouldAlertGroup: boolean;
} {
  const current = typeof currentPricePerPerson === 'number' && currentPricePerPerson > 0 ? currentPricePerPerson : 0;
  const target = typeof targetPricePerPerson === 'number' && targetPricePerPerson > 0 ? targetPricePerPerson : 0;
  const count = typeof participantCount === 'number' && participantCount > 0 ? Math.floor(participantCount) : 1;

  if (current === 0 || target === 0) {
    return {
      valid: false,
      currentTotal: 0,
      targetTotal: 0,
      potentialGroupSavings: 0,
      discountPercentage: 0,
      shouldAlertGroup: false
    };
  }

  const currentTotal = current * count;
  const targetTotal = target * count;
  const potentialGroupSavings = Math.max(0, Math.round((currentTotal - targetTotal) * 100) / 100);
  const discountPercentage = current > target ? Math.round(((current - target) / current) * 100 * 10) / 10 : 0;
  const shouldAlertGroup = current <= target || discountPercentage >= 10;

  return {
    valid: true,
    currentTotal: Math.round(currentTotal * 100) / 100,
    targetTotal: Math.round(targetTotal * 100) / 100,
    potentialGroupSavings,
    discountPercentage,
    shouldAlertGroup
  };
}

export function calculateGroupItineraryTimeSlotConflictScore(
  events: Array<{ title?: string; startHour?: number; endHour?: number }>
): {
  valid: boolean;
  totalEvents: number;
  conflictCount: number;
  hasScheduleConflicts: boolean;
  conflicts: Array<{ event1: string; event2: string }>;
} {
  if (!Array.isArray(events) || events.length === 0) {
    return { valid: false, totalEvents: 0, conflictCount: 0, hasScheduleConflicts: false, conflicts: [] };
  }

  const validEvents = events.filter(e => e && typeof e.startHour === 'number' && typeof e.endHour === 'number' && e.endHour > e.startHour);
  const conflicts: Array<{ event1: string; event2: string }> = [];

  for (let i = 0; i < validEvents.length; i++) {
    for (let j = i + 1; j < validEvents.length; j++) {
      const e1 = validEvents[i];
      const e2 = validEvents[j];

      if (e1.startHour! < e2.endHour! && e2.startHour! < e1.endHour!) {
        conflicts.push({
          event1: e1.title || `Event ${i + 1}`,
          event2: e2.title || `Event ${j + 1}`
        });
      }
    }
  }

  return {
    valid: true,
    totalEvents: validEvents.length,
    conflictCount: conflicts.length,
    hasScheduleConflicts: conflicts.length > 0,
    conflicts
  };
}

export function calculateGroupExpenseEquitabilityIndex(
  memberPayments: Array<{ memberName: string; amountPaid: number }>
): {
  valid: boolean;
  totalGroupExpense: number;
  perMemberAverage: number;
  memberCount: number;
  isEquitable: boolean;
  netBalances: Record<string, number>;
} {
  if (!Array.isArray(memberPayments) || memberPayments.length === 0) {
    return {
      valid: false,
      totalGroupExpense: 0,
      perMemberAverage: 0,
      memberCount: 0,
      isEquitable: true,
      netBalances: {}
    };
  }

  const validPayments = memberPayments.filter(m => m && typeof m.memberName === 'string' && typeof m.amountPaid === 'number' && m.amountPaid >= 0);
  if (validPayments.length === 0) {
    return {
      valid: false,
      totalGroupExpense: 0,
      perMemberAverage: 0,
      memberCount: 0,
      isEquitable: true,
      netBalances: {}
    };
  }

  const totalGroupExpense = validPayments.reduce((sum, m) => sum + m.amountPaid, 0);
  const memberCount = validPayments.length;
  const perMemberAverage = Math.round((totalGroupExpense / memberCount) * 100) / 100;

  const netBalances: Record<string, number> = {};
  let maxVariance = 0;

  for (const m of validPayments) {
    const net = Math.round((m.amountPaid - perMemberAverage) * 100) / 100;
    netBalances[m.memberName] = net;
    maxVariance = Math.max(maxVariance, Math.abs(net));
  }

  const isEquitable = maxVariance < 0.05 * perMemberAverage;

  return {
    valid: true,
    totalGroupExpense: Math.round(totalGroupExpense * 100) / 100,
    perMemberAverage,
    memberCount,
    isEquitable,
    netBalances
  };
}

export function calculateGroupExpenseSettlementOptimizations(
  balances: Record<string, number>
): {
  valid: boolean;
  settlements: Array<{ from: string; to: string; amount: number }>;
  totalSettlementCount: number;
  totalVolumeSettled: number;
} {
  if (!balances || typeof balances !== 'object' || Object.keys(balances).length === 0) {
    return { valid: false, settlements: [], totalSettlementCount: 0, totalVolumeSettled: 0 };
  }

  const debtors: Array<{ name: string; amount: number }> = [];
  const creditors: Array<{ name: string; amount: number }> = [];

  for (const [name, bal] of Object.entries(balances)) {
    if (typeof bal !== 'number' || isNaN(bal)) continue;
    const rounded = Math.round(bal * 100) / 100;
    if (rounded < -0.01) debtors.push({ name, amount: -rounded });
    else if (rounded > 0.01) creditors.push({ name, amount: rounded });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  let totalVolume = 0;
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i].amount;
    const cred = creditors[j].amount;
    const settled = Math.min(debt, cred);
    const roundedSettled = Math.round(settled * 100) / 100;

    if (roundedSettled > 0) {
      settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: roundedSettled });
      totalVolume += roundedSettled;
    }

    debtors[i].amount -= settled;
    creditors[j].amount -= settled;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return {
    valid: true,
    settlements,
    totalSettlementCount: settlements.length,
    totalVolumeSettled: Math.round(totalVolume * 100) / 100
  };
}

export function calculateGroupTravelActivityBudgetAllocation(
  totalTravelBudget: number = 2000,
  participantsCount: number = 4,
  categoryRatios: Record<string, number> = { lodging: 0.4, flights: 0.35, food: 0.15, activities: 0.1 }
): {
  valid: boolean;
  totalTravelBudget: number;
  participantsCount: number;
  perPersonBudget: number;
  categoryBreakdown: Record<string, number>;
  recommendation: string;
} {
  const budget = typeof totalTravelBudget === 'number' && !isNaN(totalTravelBudget) && totalTravelBudget > 0 ? totalTravelBudget : 0;
  const count = typeof participantsCount === 'number' && !isNaN(participantsCount) && participantsCount > 0 ? Math.floor(participantsCount) : 0;

  if (budget === 0 || count === 0) {
    return {
      valid: false,
      totalTravelBudget: 0,
      participantsCount: 0,
      perPersonBudget: 0,
      categoryBreakdown: {},
      recommendation: 'Valid total travel budget and participants count are required.'
    };
  }

  const perPersonBudget = Math.round((budget / count) * 100) / 100;
  const categoryBreakdown: Record<string, number> = {};

  for (const [cat, ratio] of Object.entries(categoryRatios)) {
    const validRatio = typeof ratio === 'number' && ratio >= 0 ? ratio : 0;
    categoryBreakdown[cat] = Math.round(budget * validRatio * 100) / 100;
  }

  return {
    valid: true,
    totalTravelBudget: budget,
    participantsCount: count,
    perPersonBudget,
    categoryBreakdown,
    recommendation: `Allocated $${perPersonBudget.toFixed(2)} per person across ${count} travelers.`
  };
}

export function calculateGroupSharedLodgingCostOptimization(
  nightlyVillaRateUsd: number = 300,
  stayDurationNights: number = 5,
  groupMemberCount: number = 6
): {
  valid: boolean;
  totalLodgingCostUsd: number;
  perPersonLodgingCostUsd: number;
  perPersonNightlyRateUsd: number;
  recommendation: string;
} {
  const rate = typeof nightlyVillaRateUsd === 'number' && nightlyVillaRateUsd > 0 ? nightlyVillaRateUsd : 0;
  const nights = typeof stayDurationNights === 'number' && stayDurationNights > 0 ? stayDurationNights : 0;
  const members = typeof groupMemberCount === 'number' && groupMemberCount > 0 ? groupMemberCount : 0;

  if (rate === 0 || nights === 0 || members === 0) {
    return {
      valid: false,
      totalLodgingCostUsd: 0,
      perPersonLodgingCostUsd: 0,
      perPersonNightlyRateUsd: 0,
      recommendation: 'Valid nightly rate, stay duration, and member count are required.'
    };
  }

  const totalLodgingCostUsd = Math.round(rate * nights * 100) / 100;
  const perPersonLodgingCostUsd = Math.round((totalLodgingCostUsd / members) * 100) / 100;
  const perPersonNightlyRateUsd = Math.round((perPersonLodgingCostUsd / nights) * 100) / 100;

  return {
    valid: true,
    totalLodgingCostUsd,
    perPersonLodgingCostUsd,
    perPersonNightlyRateUsd,
    recommendation: `Group of ${members} sharing villa for ${nights} nights pays $${perPersonNightlyRateUsd.toFixed(2)}/night per person (Total $${perPersonLodgingCostUsd.toFixed(2)} per person).`
  };
}

export function calculateGroupTripBudgetVarianceScore(
  plannedBudgetUsd: number = 1000,
  actualSpentUsd: number = 1200,
  participantCount: number = 4
): {
  valid: boolean;
  plannedBudgetUsd: number;
  actualSpentUsd: number;
  varianceAmountUsd: number;
  variancePercentage: number;
  isOverBudget: boolean;
  perPersonVarianceUsd: number;
  recommendation: string;
} {
  const planned = typeof plannedBudgetUsd === 'number' && plannedBudgetUsd > 0 ? plannedBudgetUsd : 0;
  const actual = typeof actualSpentUsd === 'number' && actualSpentUsd >= 0 ? actualSpentUsd : 0;
  const members = typeof participantCount === 'number' && participantCount > 0 ? participantCount : 1;

  if (planned === 0) {
    return {
      valid: false,
      plannedBudgetUsd: 0,
      actualSpentUsd: 0,
      varianceAmountUsd: 0,
      variancePercentage: 0,
      isOverBudget: false,
      perPersonVarianceUsd: 0,
      recommendation: 'Planned budget must be a positive number.'
    };
  }

  const varianceAmountUsd = Math.round((actual - planned) * 100) / 100;
  const variancePercentage = Math.round(((actual - planned) / planned) * 100 * 10) / 10;
  const isOverBudget = varianceAmountUsd > 0;
  const perPersonVarianceUsd = Math.round((varianceAmountUsd / members) * 100) / 100;

  return {
    valid: true,
    plannedBudgetUsd: planned,
    actualSpentUsd: actual,
    varianceAmountUsd,
    variancePercentage,
    isOverBudget,
    perPersonVarianceUsd,
    recommendation: isOverBudget
      ? `Actual spend exceeds planned budget by $${varianceAmountUsd.toFixed(2)} (${variancePercentage}% over budget; +$${perPersonVarianceUsd.toFixed(2)} per person).`
      : `Actual spend is within budget ($${Math.abs(varianceAmountUsd).toFixed(2)} savings).`
  };
}

export function calculateGroupSettlementFairnessIndex(
  netBalances: Record<string, number> = {}
): {
  valid: boolean;
  participantCount: number;
  totalImbalanceUsd: number;
  maxDebtor: string;
  maxCreditor: string;
  fairnessIndex: number;
  isFair: boolean;
  recommendation: string;
} {
  const entries = Object.entries(netBalances);
  if (entries.length === 0) {
    return {
      valid: false,
      participantCount: 0,
      totalImbalanceUsd: 0,
      maxDebtor: '',
      maxCreditor: '',
      fairnessIndex: 100,
      isFair: true,
      recommendation: 'Net balances map cannot be empty.'
    };
  }

  let totalImbalanceUsd = 0;
  let minBal = 0;
  let maxBal = 0;
  let maxDebtor = '';
  let maxCreditor = '';

  for (const [person, bal] of entries) {
    const val = typeof bal === 'number' && !isNaN(bal) ? bal : 0;
    totalImbalanceUsd += Math.abs(val);
    if (val < minBal) {
      minBal = val;
      maxDebtor = person;
    }
    if (val > maxBal) {
      maxBal = val;
      maxCreditor = person;
    }
  }

  totalImbalanceUsd = Math.round(totalImbalanceUsd * 100) / 100;
  const avgImbalance = totalImbalanceUsd / entries.length;
  const fairnessIndex = Math.max(0, Math.min(100, Math.round(100 - (avgImbalance * 0.25))));
  const isFair = fairnessIndex >= 70;

  return {
    valid: true,
    participantCount: entries.length,
    totalImbalanceUsd,
    maxDebtor,
    maxCreditor,
    fairnessIndex,
    isFair,
    recommendation: isFair
      ? 'Group expense distribution is balanced and fair.'
      : `High imbalance detected ($${totalImbalanceUsd.toFixed(2)} total imbalance). Recommend settling debts.`
  };
}

export function calculateGroupTripCurrencyReserve(
  estimatedTotalCostHomeCurrency: number = 2000,
  volatilityPercentage: number = 5.0,
  bufferPercentage: number = 10.0,
  memberCount: number = 4
): {
  valid: boolean;
  estimatedTotalCostHomeCurrency: number;
  currencyVolatilityReserveUsd: number;
  contingencyBufferUsd: number;
  recommendedTotalGroupReserveUsd: number;
  perMemberTargetContributionUsd: number;
  safetyTier: 'CONSERVATIVE' | 'BALANCED' | 'MINIMAL';
  recommendation: string;
} {
  const cost = typeof estimatedTotalCostHomeCurrency === 'number' && !isNaN(estimatedTotalCostHomeCurrency) && estimatedTotalCostHomeCurrency > 0 ? estimatedTotalCostHomeCurrency : 0;
  const members = typeof memberCount === 'number' && !isNaN(memberCount) && memberCount > 0 ? Math.floor(memberCount) : 0;

  if (cost === 0 || members === 0) {
    return {
      valid: false,
      estimatedTotalCostHomeCurrency: 0,
      currencyVolatilityReserveUsd: 0,
      contingencyBufferUsd: 0,
      recommendedTotalGroupReserveUsd: 0,
      perMemberTargetContributionUsd: 0,
      safetyTier: 'MINIMAL',
      recommendation: 'Valid total cost and member count required.'
    };
  }

  const volPct = typeof volatilityPercentage === 'number' && !isNaN(volatilityPercentage) && volatilityPercentage >= 0 ? volatilityPercentage / 100 : 0.05;
  const bufPct = typeof bufferPercentage === 'number' && !isNaN(bufferPercentage) && bufferPercentage >= 0 ? bufferPercentage / 100 : 0.10;

  const currencyVolatilityReserveUsd = Math.round(cost * volPct * 100) / 100;
  const contingencyBufferUsd = Math.round(cost * bufPct * 100) / 100;
  const totalReserve = currencyVolatilityReserveUsd + contingencyBufferUsd;
  const recommendedTotalGroupReserveUsd = Math.round((cost + totalReserve) * 100) / 100;
  const perMemberTargetContributionUsd = Math.round((recommendedTotalGroupReserveUsd / members) * 100) / 100;

  const totalBufferRate = volPct + bufPct;
  let safetyTier: 'CONSERVATIVE' | 'BALANCED' | 'MINIMAL' = 'BALANCED';
  if (totalBufferRate >= 0.15) safetyTier = 'CONSERVATIVE';
  else if (totalBufferRate < 0.08) safetyTier = 'MINIMAL';

  return {
    valid: true,
    estimatedTotalCostHomeCurrency: cost,
    currencyVolatilityReserveUsd,
    contingencyBufferUsd,
    recommendedTotalGroupReserveUsd,
    perMemberTargetContributionUsd,
    safetyTier,
    recommendation: `Recommended total budget of $${recommendedTotalGroupReserveUsd.toFixed(2)} ($${perMemberTargetContributionUsd.toFixed(2)}/person) includes $${totalReserve.toFixed(2)} for currency volatility & contingency reserve.`
  };
}

export function calculateGroupBookingPaymentStagingMilestones({
  totalBookingCostUsd = 1200,
  depositPercentage = 25,
  installmentCount = 3,
  memberCount = 4
}: {
  totalBookingCostUsd?: number;
  depositPercentage?: number;
  installmentCount?: number;
  memberCount?: number;
} = {}): {
  valid: boolean;
  totalBookingCostUsd: number;
  depositAmountUsd: number;
  perMemberDepositUsd: number;
  remainingBalanceUsd: number;
  installmentAmountUsd: number;
  perMemberInstallmentUsd: number;
  schedule: Array<{ milestone: string; groupAmountUsd: number; perMemberAmountUsd: number }>;
  recommendation: string;
} {
  if (typeof totalBookingCostUsd !== 'number' || isNaN(totalBookingCostUsd) || totalBookingCostUsd <= 0 ||
      typeof memberCount !== 'number' || isNaN(memberCount) || memberCount <= 0) {
    return {
      valid: false,
      totalBookingCostUsd: 0,
      depositAmountUsd: 0,
      perMemberDepositUsd: 0,
      remainingBalanceUsd: 0,
      installmentAmountUsd: 0,
      perMemberInstallmentUsd: 0,
      schedule: [],
      recommendation: 'Valid total cost and member count required.'
    };
  }

  const depPct = typeof depositPercentage === 'number' && !isNaN(depositPercentage) && depositPercentage >= 0 && depositPercentage <= 100 ? depositPercentage / 100 : 0.25;
  const installments = typeof installmentCount === 'number' && !isNaN(installmentCount) && installmentCount > 0 ? Math.min(12, Math.round(installmentCount)) : 3;

  const depositAmountUsd = Math.round(totalBookingCostUsd * depPct * 100) / 100;
  const perMemberDepositUsd = Math.round((depositAmountUsd / memberCount) * 100) / 100;

  const remainingBalanceUsd = Math.round((totalBookingCostUsd - depositAmountUsd) * 100) / 100;
  const installmentAmountUsd = Math.round((remainingBalanceUsd / installments) * 100) / 100;
  const perMemberInstallmentUsd = Math.round((installmentAmountUsd / memberCount) * 100) / 100;

  const schedule = [
    {
      milestone: 'Initial Deposit (Booking Lock)',
      groupAmountUsd: depositAmountUsd,
      perMemberAmountUsd: perMemberDepositUsd
    }
  ];

  for (let i = 1; i <= installments; i++) {
    schedule.push({
      milestone: `Installment ${i} of ${installments}`,
      groupAmountUsd: installmentAmountUsd,
      perMemberAmountUsd: perMemberInstallmentUsd
    });
  }

  return {
    valid: true,
    totalBookingCostUsd,
    depositAmountUsd,
    perMemberDepositUsd,
    remainingBalanceUsd,
    installmentAmountUsd,
    perMemberInstallmentUsd,
    schedule,
    recommendation: `Group deposit of $${depositAmountUsd.toFixed(2)} ($${perMemberDepositUsd.toFixed(2)}/person) required upfront, followed by ${installments} installments of $${installmentAmountUsd.toFixed(2)} ($${perMemberInstallmentUsd.toFixed(2)}/person).`
  };
}

export function calculateGroupFlightCarPoolEfficiencyScore(
  groupSize: number = 4,
  totalRentalCarCostUsd: number = 300,
  individualRideShareCostUsd: number = 80,
  durationDays: number = 3
): {
  valid: boolean;
  groupSize: number;
  perPersonRentalCostUsd: number;
  totalIndividualCostUsd: number;
  totalCarpoolSavingsUsd: number;
  perPersonSavingsUsd: number;
  efficiencyTier: string;
  recommendation: string;
} {
  const members = typeof groupSize === 'number' && groupSize > 0 ? groupSize : 0;
  const rentalCost = typeof totalRentalCarCostUsd === 'number' && totalRentalCarCostUsd > 0 ? totalRentalCarCostUsd : 0;
  const rideshareCost = typeof individualRideShareCostUsd === 'number' && individualRideShareCostUsd > 0 ? individualRideShareCostUsd : 0;
  const days = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 1;

  if (members === 0 || rentalCost === 0 || rideshareCost === 0) {
    return {
      valid: false,
      groupSize: 0,
      perPersonRentalCostUsd: 0,
      totalIndividualCostUsd: 0,
      totalCarpoolSavingsUsd: 0,
      perPersonSavingsUsd: 0,
      efficiencyTier: 'INVALID_INPUT',
      recommendation: 'Valid positive group size, rental cost, and rideshare cost required.'
    };
  }

  const perPersonRentalCostUsd = Math.round((rentalCost / members) * 100) / 100;
  const totalIndividualCostUsd = Math.round(rideshareCost * members * 100) / 100;
  const totalCarpoolSavingsUsd = Math.round((totalIndividualCostUsd - rentalCost) * 100) / 100;
  const perPersonSavingsUsd = Math.round((totalCarpoolSavingsUsd / members) * 100) / 100;

  let efficiencyTier = 'CARPOOL_OPTIMAL';
  if (totalCarpoolSavingsUsd <= -50) efficiencyTier = 'INDIVIDUAL_RIDESHARE_BETTER';
  else if (Math.abs(totalCarpoolSavingsUsd) < 50) efficiencyTier = 'EQUIVALENT_COST';

  let recommendation = `Group carpool saves $${perPersonSavingsUsd.toFixed(2)} per person compared to individual rideshares over ${days} days.`;
  if (efficiencyTier === 'INDIVIDUAL_RIDESHARE_BETTER') {
    recommendation = `Individual rideshares are cheaper by $${Math.abs(perPersonSavingsUsd).toFixed(2)} per person. Skip car rental.`;
  } else if (efficiencyTier === 'EQUIVALENT_COST') {
    recommendation = `Cost is nearly equivalent ($${perPersonRentalCostUsd.toFixed(2)} vs $${rideshareCost.toFixed(2)}/person). Choose based on convenience.`;
  }

  return {
    valid: true,
    groupSize: members,
    perPersonRentalCostUsd,
    totalIndividualCostUsd,
    totalCarpoolSavingsUsd,
    perPersonSavingsUsd,
    efficiencyTier,
    recommendation
  };
}

export function calculateGroupMultiDestinationItineraryEfficiency(
  destinations: Array<{ city: string; lodgingCostUsd: number; transitCostUsd: number; stayDays: number }> = []
): {
  valid: boolean;
  totalTripCostUsd: number;
  averageDailySpendUsd: number;
  totalDays: number;
  mostExpensiveCity: string;
  lodgingVsTransitRatio: number;
  efficiencyScore: number;
  recommendation: string;
} {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    return {
      valid: false,
      totalTripCostUsd: 0,
      averageDailySpendUsd: 0,
      totalDays: 0,
      mostExpensiveCity: '',
      lodgingVsTransitRatio: 0,
      efficiencyScore: 0,
      recommendation: 'At least one destination is required.'
    };
  }

  let totalLodging = 0;
  let totalTransit = 0;
  let totalDays = 0;
  let maxCityCost = -1;
  let mostExpensiveCity = '';

  for (const dest of destinations) {
    const lodging = typeof dest.lodgingCostUsd === 'number' && dest.lodgingCostUsd > 0 ? dest.lodgingCostUsd : 0;
    const transit = typeof dest.transitCostUsd === 'number' && dest.transitCostUsd > 0 ? dest.transitCostUsd : 0;
    const days = typeof dest.stayDays === 'number' && dest.stayDays > 0 ? dest.stayDays : 1;

    const cityTotal = lodging + transit;
    totalLodging += lodging;
    totalTransit += transit;
    totalDays += days;

    if (cityTotal > maxCityCost) {
      maxCityCost = cityTotal;
      mostExpensiveCity = dest.city || 'Unknown';
    }
  }

  const totalTripCostUsd = Math.round((totalLodging + totalTransit) * 100) / 100;
  const averageDailySpendUsd = totalDays > 0 ? Math.round((totalTripCostUsd / totalDays) * 100) / 100 : 0;
  const lodgingVsTransitRatio = totalTransit > 0 ? Math.round((totalLodging / totalTransit) * 100) / 100 : 10;

  let efficiencyScore = 100;
  if (lodgingVsTransitRatio < 1.5) efficiencyScore -= 20; // High transit relative to stay
  if (averageDailySpendUsd > 300) efficiencyScore -= 15;
  efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

  return {
    valid: true,
    totalTripCostUsd,
    averageDailySpendUsd,
    totalDays,
    mostExpensiveCity,
    lodgingVsTransitRatio,
    efficiencyScore,
    recommendation: `Multi-city itinerary total: $${totalTripCostUsd.toFixed(2)} over ${totalDays} days ($${averageDailySpendUsd.toFixed(2)}/day). Peak cost city: ${mostExpensiveCity}.`
  };
}

export function calculateGroupActivityTicketBulkDiscount(
  individualTicketPriceUsd: number = 50,
  groupSize: number = 8,
  bulkDiscountPercentage: number = 15
): {
  valid: boolean;
  individualTicketPriceUsd: number;
  groupSize: number;
  bulkDiscountPercentage: number;
  totalWithoutDiscountUsd: number;
  totalWithDiscountUsd: number;
  perPersonDiscountedPriceUsd: number;
  totalGroupSavingsUsd: number;
  isBulkDiscountApplied: boolean;
  recommendation: string;
} {
  const price = typeof individualTicketPriceUsd === 'number' && individualTicketPriceUsd > 0 ? individualTicketPriceUsd : 0;
  const size = typeof groupSize === 'number' && groupSize > 0 ? Math.floor(groupSize) : 0;

  if (price === 0 || size === 0) {
    return {
      valid: false,
      individualTicketPriceUsd: 0,
      groupSize: 0,
      bulkDiscountPercentage: 0,
      totalWithoutDiscountUsd: 0,
      totalWithDiscountUsd: 0,
      perPersonDiscountedPriceUsd: 0,
      totalGroupSavingsUsd: 0,
      isBulkDiscountApplied: false,
      recommendation: 'Valid individual ticket price and group size required.'
    };
  }

  const discountPct = typeof bulkDiscountPercentage === 'number' && bulkDiscountPercentage >= 0 ? Math.min(100, bulkDiscountPercentage) : 0;
  const isBulkDiscountApplied = size >= 5 && discountPct > 0;
  const effectiveDiscount = isBulkDiscountApplied ? discountPct / 100 : 0;

  const totalWithoutDiscountUsd = Math.round(price * size * 100) / 100;
  const perPersonDiscountedPriceUsd = Math.round(price * (1 - effectiveDiscount) * 100) / 100;
  const totalWithDiscountUsd = Math.round(perPersonDiscountedPriceUsd * size * 100) / 100;
  const totalGroupSavingsUsd = Math.round((totalWithoutDiscountUsd - totalWithDiscountUsd) * 100) / 100;

  return {
    valid: true,
    individualTicketPriceUsd: price,
    groupSize: size,
    bulkDiscountPercentage: discountPct,
    totalWithoutDiscountUsd,
    totalWithDiscountUsd,
    perPersonDiscountedPriceUsd,
    totalGroupSavingsUsd,
    isBulkDiscountApplied,
    recommendation: isBulkDiscountApplied
      ? `Group bulk discount of ${discountPct}% applied! Group saves $${totalGroupSavingsUsd.toFixed(2)} ($${perPersonDiscountedPriceUsd.toFixed(2)}/person vs $${price.toFixed(2)}).`
      : `Group size of ${size} does not trigger bulk discount (minimum 5 required).`
  };
}

export function calculateGroupTripBudgetVarianceAnalysis(
  allocatedBudgetUsd: number,
  actualSpentUsd: number,
  totalDays: number,
  daysElapsed: number
): {
  valid: boolean;
  allocatedBudgetUsd: number;
  actualSpentUsd: number;
  varianceUsd: number;
  variancePercentage: number;
  dailySpendRateUsd: number;
  projectedTotalSpendUsd: number;
  budgetStatus: 'UNDER_BUDGET' | 'ON_TRACK' | 'OVER_BUDGET';
  recommendedDailyLimitForRemainingDaysUsd: number;
  recommendation: string;
} {
  const budget = typeof allocatedBudgetUsd === 'number' && allocatedBudgetUsd > 0 ? allocatedBudgetUsd : 0;
  const spent = typeof actualSpentUsd === 'number' && actualSpentUsd >= 0 ? actualSpentUsd : 0;
  const totalD = typeof totalDays === 'number' && totalDays > 0 ? totalDays : 1;
  const elapsedD = typeof daysElapsed === 'number' && daysElapsed >= 0 ? Math.min(totalD, daysElapsed) : 0;

  if (budget === 0) {
    return {
      valid: false,
      allocatedBudgetUsd: 0,
      actualSpentUsd: 0,
      varianceUsd: 0,
      variancePercentage: 0,
      dailySpendRateUsd: 0,
      projectedTotalSpendUsd: 0,
      budgetStatus: 'ON_TRACK',
      recommendedDailyLimitForRemainingDaysUsd: 0,
      recommendation: 'Allocated budget must be greater than zero.'
    };
  }

  const varianceUsd = Math.round((budget - spent) * 100) / 100;
  const variancePercentage = Math.round(((spent - budget) / budget) * 100 * 10) / 10;
  const dailySpendRateUsd = elapsedD > 0 ? Math.round((spent / elapsedD) * 100) / 100 : 0;
  const projectedTotalSpendUsd = Math.round((dailySpendRateUsd * totalD) * 100) / 100;

  let budgetStatus: 'UNDER_BUDGET' | 'ON_TRACK' | 'OVER_BUDGET' = 'ON_TRACK';
  if (projectedTotalSpendUsd > budget * 1.05) budgetStatus = 'OVER_BUDGET';
  else if (projectedTotalSpendUsd < budget * 0.95) budgetStatus = 'UNDER_BUDGET';

  const remainingDays = totalD - elapsedD;
  const remainingBudget = Math.max(0, budget - spent);
  const recommendedDailyLimitForRemainingDaysUsd = remainingDays > 0 ? Math.round((remainingBudget / remainingDays) * 100) / 100 : 0;

  return {
    valid: true,
    allocatedBudgetUsd: budget,
    actualSpentUsd: spent,
    varianceUsd,
    variancePercentage,
    dailySpendRateUsd,
    projectedTotalSpendUsd,
    budgetStatus,
    recommendedDailyLimitForRemainingDaysUsd,
    recommendation: budgetStatus === 'OVER_BUDGET'
      ? `Warning: Group is spending $${dailySpendRateUsd}/day and projected to exceed budget by $${(projectedTotalSpendUsd - budget).toFixed(2)}. Adjust remaining daily spend limit to $${recommendedDailyLimitForRemainingDaysUsd}/day.`
      : `Group budget status is ${budgetStatus.toLowerCase().replace('_', ' ')}. Spending $${dailySpendRateUsd}/day with recommended remaining limit of $${recommendedDailyLimitForRemainingDaysUsd}/day.`
  };
}

export function calculateGroupTravelInsurancePayerDistribution({
  basePolicyCostUsd = 200,
  groupDiscountPercentage = 10,
  participants = [
    { name: 'Alice', age: 28, isHighRiskActivity: false },
    { name: 'Bob', age: 62, isHighRiskActivity: true }
  ]
}: {
  basePolicyCostUsd?: number;
  groupDiscountPercentage?: number;
  participants?: Array<{ name: string; age?: number; isHighRiskActivity?: boolean }>;
} = {}): {
  valid: boolean;
  basePolicyCostUsd: number;
  groupDiscountPercentage: number;
  totalGroupCostUsd: number;
  savingsUsd: number;
  breakdown: Array<{ name: string; shareUsd: number; riskFactor: number }>;
  recommendation: string;
} {
  const baseCost = typeof basePolicyCostUsd === 'number' && basePolicyCostUsd > 0 ? basePolicyCostUsd : 200;
  const discountPct = typeof groupDiscountPercentage === 'number' && groupDiscountPercentage >= 0 ? groupDiscountPercentage : 0;
  const members = Array.isArray(participants) && participants.length > 0 ? participants : [{ name: 'Traveler 1' }];

  const memberMetrics = members.map(m => {
    const age = typeof m.age === 'number' ? m.age : 30;
    let riskFactor = 1.0;
    if (age >= 60) riskFactor = 1.5;
    else if (age >= 45) riskFactor = 1.25;
    if (m.isHighRiskActivity) riskFactor += 0.25;

    return {
      name: m.name || 'Traveler',
      riskFactor
    };
  });

  const totalRiskUnits = memberMetrics.reduce((sum, m) => sum + m.riskFactor, 0);
  const discountedTotalCost = baseCost * (1 - discountPct / 100);
  const savings = Math.round((baseCost - discountedTotalCost) * 100) / 100;

  const breakdown = memberMetrics.map(m => {
    const shareUsd = Math.round((discountedTotalCost * (m.riskFactor / totalRiskUnits)) * 100) / 100;
    return {
      name: m.name,
      shareUsd,
      riskFactor: m.riskFactor
    };
  });

  return {
    valid: true,
    basePolicyCostUsd: baseCost,
    groupDiscountPercentage: discountPct,
    totalGroupCostUsd: Math.round(discountedTotalCost * 100) / 100,
    savingsUsd: savings,
    breakdown,
    recommendation: `Group travel insurance total is $${discountedTotalCost.toFixed(2)} with $${savings.toFixed(2)} group discount savings split fairly across ${members.length} travelers based on risk factors.`
  };
}

export function calculateGroupTripEmergencyContingencyReserve(
  totalTripExpenses: number = 5000,
  memberCount: number = 4,
  tripDurationDays: number = 7,
  destinationRiskTier: 'standard' | 'adventure' | 'remote' = 'standard'
): {
  valid: boolean;
  totalTripExpenses: number;
  memberCount: number;
  tripDurationDays: number;
  recommendedReservePercentage: number;
  totalReserveAmountUsd: number;
  perMemberReserveContributionUsd: number;
  dailyContingencyAllowanceUsd: number;
  recommendation: string;
} {
  const expenses = typeof totalTripExpenses === 'number' && !isNaN(totalTripExpenses) && totalTripExpenses > 0 ? totalTripExpenses : 0;
  const members = typeof memberCount === 'number' && !isNaN(memberCount) && memberCount > 0 ? Math.floor(memberCount) : 0;
  const days = typeof tripDurationDays === 'number' && !isNaN(tripDurationDays) && tripDurationDays > 0 ? Math.floor(tripDurationDays) : 0;

  if (expenses === 0 || members === 0 || days === 0) {
    return {
      valid: false,
      totalTripExpenses: 0,
      memberCount: 0,
      tripDurationDays: 0,
      recommendedReservePercentage: 0,
      totalReserveAmountUsd: 0,
      perMemberReserveContributionUsd: 0,
      dailyContingencyAllowanceUsd: 0,
      recommendation: 'Valid trip expenses, member count, and duration days are required.'
    };
  }

  let reservePct = 15;
  if (destinationRiskTier === 'adventure') reservePct = 25;
  else if (destinationRiskTier === 'remote') reservePct = 35;

  const totalReserveAmountUsd = Math.round(expenses * (reservePct / 100) * 100) / 100;
  const perMemberReserveContributionUsd = Math.round((totalReserveAmountUsd / members) * 100) / 100;
  const dailyContingencyAllowanceUsd = Math.round((totalReserveAmountUsd / days) * 100) / 100;

  return {
    valid: true,
    totalTripExpenses: expenses,
    memberCount: members,
    tripDurationDays: days,
    recommendedReservePercentage: reservePct,
    totalReserveAmountUsd,
    perMemberReserveContributionUsd,
    dailyContingencyAllowanceUsd,
    recommendation: `Recommended emergency contingency reserve is $${totalReserveAmountUsd.toFixed(2)} (${reservePct}% of trip budget), requiring $${perMemberReserveContributionUsd.toFixed(2)} contribution per member.`
  };
}




