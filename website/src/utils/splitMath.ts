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

export function calculateGroupTripCarbonAndBudgetEfficiency(
  groupSize: number = 4,
  totalDistanceKm: number = 1000,
  transportMode: 'flight' | 'train' | 'carpool' = 'train',
  totalLodgingCost: number = 800
): {
  valid: boolean;
  groupSize: number;
  totalCo2KgPerPerson: number;
  co2SavingsPercent: number;
  costSavingsPerPersonUsd: number;
  ecoBudgetEfficiencyIndex: number;
  efficiencyRating: string;
  recommendation: string;
} {
  const members = typeof groupSize === 'number' && groupSize > 0 ? Math.floor(groupSize) : 0;
  const distance = typeof totalDistanceKm === 'number' && totalDistanceKm > 0 ? totalDistanceKm : 0;

  if (members === 0 || distance === 0) {
    return {
      valid: false,
      groupSize: 0,
      totalCo2KgPerPerson: 0,
      co2SavingsPercent: 0,
      costSavingsPerPersonUsd: 0,
      ecoBudgetEfficiencyIndex: 0,
      efficiencyRating: 'INVALID_INPUT',
      recommendation: 'Valid group size and distance in km are required.'
    };
  }

  let co2PerKm = 0.25; // flight baseline
  if (transportMode === 'train') co2PerKm = 0.04;
  else if (transportMode === 'carpool') co2PerKm = 0.12 / members;

  const totalCo2KgPerPerson = Math.round(distance * co2PerKm * 100) / 100;
  const flightBaselineCo2 = distance * 0.25;
  const co2SavingsPercent = Math.max(0, Math.round(((flightBaselineCo2 - totalCo2KgPerPerson) / flightBaselineCo2) * 100));

  const perPersonLodgingUsd = Math.round((totalLodgingCost / members) * 100) / 100;
  const soloLodgingBaselineUsd = totalLodgingCost;
  const costSavingsPerPersonUsd = Math.round((soloLodgingBaselineUsd - perPersonLodgingUsd) * 100) / 100;

  const ecoBudgetEfficiencyIndex = Math.min(100, Math.round((co2SavingsPercent * 0.5) + Math.min(50, (costSavingsPerPersonUsd / soloLodgingBaselineUsd) * 50)));

  let efficiencyRating = 'HIGH_EFFICIENCY';
  if (ecoBudgetEfficiencyIndex < 40) efficiencyRating = 'LOW_EFFICIENCY';
  else if (ecoBudgetEfficiencyIndex < 75) efficiencyRating = 'MODERATE_EFFICIENCY';

  return {
    valid: true,
    groupSize: members,
    totalCo2KgPerPerson,
    co2SavingsPercent,
    costSavingsPerPersonUsd,
    ecoBudgetEfficiencyIndex,
    efficiencyRating,
    recommendation: `Group travel (${members} members, ${transportMode}) saves ${co2SavingsPercent}% CO2 and $${costSavingsPerPersonUsd.toFixed(2)} lodging cost per person (Eco-Budget Score: ${ecoBudgetEfficiencyIndex}/100).`
  };
}

export function calculateGroupTripBudgetForecastAndOptimization(
  totalGroupBudgetUsd: number = 2000,
  committedExpensesUsd: number = 1400,
  groupSize: number = 4,
  daysRemaining: number = 5
): {
  valid: boolean;
  totalGroupBudgetUsd: number;
  committedExpensesUsd: number;
  remainingBufferUsd: number;
  dailySpendablePerPersonUsd: number;
  budgetBufferPercent: number;
  isBudgetSafe: boolean;
  budgetHealthRating: string;
  recommendation: string;
} {
  const budget = typeof totalGroupBudgetUsd === 'number' && totalGroupBudgetUsd > 0 ? totalGroupBudgetUsd : 0;
  const committed = typeof committedExpensesUsd === 'number' && committedExpensesUsd >= 0 ? committedExpensesUsd : 0;
  const members = typeof groupSize === 'number' && groupSize > 0 ? Math.floor(groupSize) : 1;
  const days = typeof daysRemaining === 'number' && daysRemaining > 0 ? Math.floor(daysRemaining) : 1;

  if (budget === 0) {
    return {
      valid: false,
      totalGroupBudgetUsd: 0,
      committedExpensesUsd: 0,
      remainingBufferUsd: 0,
      dailySpendablePerPersonUsd: 0,
      budgetBufferPercent: 0,
      isBudgetSafe: false,
      budgetHealthRating: 'INVALID_INPUT',
      recommendation: 'Total group budget must be greater than 0.'
    };
  }

  const remainingBufferUsd = Math.round((budget - committed) * 100) / 100;
  const budgetBufferPercent = Math.max(0, Math.round((remainingBufferUsd / budget) * 100));
  const dailySpendablePerPersonUsd = Math.max(0, Math.round((remainingBufferUsd / (members * days)) * 100) / 100);

  const isBudgetSafe = remainingBufferUsd >= 0 && budgetBufferPercent >= 15;
  let budgetHealthRating = 'HEALTHY';
  if (remainingBufferUsd < 0) budgetHealthRating = 'OVER_BUDGET';
  else if (budgetBufferPercent < 15) budgetHealthRating = 'TIGHT_BUFFER';

  return {
    valid: true,
    totalGroupBudgetUsd: budget,
    committedExpensesUsd: committed,
    remainingBufferUsd,
    dailySpendablePerPersonUsd,
    budgetBufferPercent,
    isBudgetSafe,
    budgetHealthRating,
    recommendation: isBudgetSafe
      ? `Group trip budget is healthy with $${remainingBufferUsd.toFixed(2)} buffer (${budgetBufferPercent}% remaining, $${dailySpendablePerPersonUsd.toFixed(2)}/day per person).`
      : budgetHealthRating === 'OVER_BUDGET'
      ? `Trip expenses exceed total budget by $${Math.abs(remainingBufferUsd).toFixed(2)}. Adjust planned group activities.`
      : `Tight budget buffer remaining ($${remainingBufferUsd.toFixed(2)} left for ${days} days).`
  };
}

export function calculateGroupTripCancellationRefundDistribution({
  totalBookingCostUsd = 1200,
  grossRefundAmountUsd = 900,
  cancellationFeeUsd = 100,
  participantContributions = {}
}: {
  totalBookingCostUsd?: number;
  grossRefundAmountUsd?: number;
  cancellationFeeUsd?: number;
  participantContributions?: Record<string, number>;
} = {}): {
  valid: boolean;
  totalBookingCostUsd: number;
  grossRefundAmountUsd: number;
  netRefundPoolUsd: number;
  cancellationFeeUsd: number;
  participantRefunds: Record<string, number>;
  refundPercentage: number;
  recommendation: string;
} {
  const cost = typeof totalBookingCostUsd === 'number' && totalBookingCostUsd > 0 ? totalBookingCostUsd : 0;
  const gross = typeof grossRefundAmountUsd === 'number' && grossRefundAmountUsd >= 0 ? grossRefundAmountUsd : 0;
  const fee = typeof cancellationFeeUsd === 'number' && cancellationFeeUsd >= 0 ? cancellationFeeUsd : 0;

  if (cost === 0) {
    return {
      valid: false,
      totalBookingCostUsd: 0,
      grossRefundAmountUsd: 0,
      netRefundPoolUsd: 0,
      cancellationFeeUsd: 0,
      participantRefunds: {},
      refundPercentage: 0,
      recommendation: 'Total booking cost must be greater than 0.'
    };
  }

  const netRefundPoolUsd = Math.max(0, Math.round((gross - fee) * 100) / 100);
  const refundPercentage = Math.round((netRefundPoolUsd / cost) * 100 * 10) / 10;

  const entries = Object.entries(participantContributions);
  const participantRefunds: Record<string, number> = {};

  if (entries.length > 0) {
    const totalPaid = entries.reduce((sum, [, amount]) => sum + (typeof amount === 'number' && amount > 0 ? amount : 0), 0);
    const divisor = totalPaid > 0 ? totalPaid : cost;

    for (const [name, amount] of entries) {
      const paid = typeof amount === 'number' && amount > 0 ? amount : 0;
      participantRefunds[name] = Math.round((netRefundPoolUsd * (paid / divisor)) * 100) / 100;
    }
  }

  return {
    valid: true,
    totalBookingCostUsd: cost,
    grossRefundAmountUsd: gross,
    netRefundPoolUsd,
    cancellationFeeUsd: fee,
    participantRefunds,
    refundPercentage,
    recommendation: `Net cancellation refund pool is $${netRefundPoolUsd.toFixed(2)} (${refundPercentage}% of original booking cost).`
  };
}

export function calculateGroupTripExpenseShareWithTieredRatios({
  totalExpenseUsd = 600,
  tieredShares = [
    { name: 'Alice', weight: 1.0 },
    { name: 'Bob', weight: 1.0 },
    { name: 'Charlie', weight: 0.5 }
  ]
}: {
  totalExpenseUsd?: number;
  tieredShares?: Array<{ name: string; weight?: number }>;
} = {}): {
  valid: boolean;
  totalExpenseUsd: number;
  totalWeights: number;
  individualShares: Record<string, number>;
  recommendation: string;
} {
  const expense = typeof totalExpenseUsd === 'number' && totalExpenseUsd > 0 ? totalExpenseUsd : 0;
  if (expense === 0 || !Array.isArray(tieredShares) || tieredShares.length === 0) {
    return {
      valid: false,
      totalExpenseUsd: 0,
      totalWeights: 0,
      individualShares: {},
      recommendation: 'Valid total expense and non-empty tiered shares array required.'
    };
  }

  const totalWeights = tieredShares.reduce((sum, item) => sum + (typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1.0), 0);
  const individualShares: Record<string, number> = {};

  for (const item of tieredShares) {
    const name = item.name || 'Member';
    const weight = typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1.0;
    individualShares[name] = Math.round((expense * (weight / totalWeights)) * 100) / 100;
  }

  return {
    valid: true,
    totalExpenseUsd: expense,
    totalWeights,
    individualShares,
    recommendation: `Expense of $${expense.toFixed(2)} split proportionally across ${tieredShares.length} participants with total weight ${totalWeights}.`
  };
}

export function calculateGroupTripSharedAccommodationSplit({
  totalLodgingCostUsd = 1200,
  roomTiers = [
    { name: 'Alice', roomTier: 'Master Suite', nightsStayed: 4, tierMultiplier: 1.5 },
    { name: 'Bob', roomTier: 'Standard Room', nightsStayed: 4, tierMultiplier: 1.0 },
    { name: 'Charlie', roomTier: 'Standard Room', nightsStayed: 2, tierMultiplier: 1.0 }
  ]
}: {
  totalLodgingCostUsd?: number;
  roomTiers?: Array<{ name: string; roomTier?: string; nightsStayed?: number; tierMultiplier?: number }>;
} = {}): {
  valid: boolean;
  totalLodgingCostUsd: number;
  perPersonShareMap: Record<string, number>;
  recommendation: string;
} {
  const cost = typeof totalLodgingCostUsd === 'number' && totalLodgingCostUsd > 0 ? totalLodgingCostUsd : 0;
  if (cost === 0 || !Array.isArray(roomTiers) || roomTiers.length === 0) {
    return {
      valid: false,
      totalLodgingCostUsd: 0,
      perPersonShareMap: {},
      recommendation: 'Valid total lodging cost and room tiers array required.'
    };
  }

  let totalWeightedNights = 0;
  for (const item of roomTiers) {
    const nights = typeof item.nightsStayed === 'number' && item.nightsStayed > 0 ? item.nightsStayed : 1;
    const mult = typeof item.tierMultiplier === 'number' && item.tierMultiplier > 0 ? item.tierMultiplier : 1.0;
    totalWeightedNights += nights * mult;
  }

  const perPersonShareMap: Record<string, number> = {};
  for (const item of roomTiers) {
    const name = item.name || 'Member';
    const nights = typeof item.nightsStayed === 'number' && item.nightsStayed > 0 ? item.nightsStayed : 1;
    const mult = typeof item.tierMultiplier === 'number' && item.tierMultiplier > 0 ? item.tierMultiplier : 1.0;
    const itemWeightedNights = nights * mult;
    perPersonShareMap[name] = Math.round((cost * (itemWeightedNights / totalWeightedNights)) * 100) / 100;
  }

  return {
    valid: true,
    totalLodgingCostUsd: cost,
    perPersonShareMap,
    recommendation: `Total lodging cost $${cost.toFixed(2)} split across ${roomTiers.length} guests weighted by room tier and nights stayed.`
  };
}

export function calculateGroupFlightAndHotelBundleSplit({
  bundleTotalCostUsd = 2000,
  packageDiscountUsd = 200,
  members = [
    { name: 'Alice', flightCostUsd: 400, hotelShareUsd: 500, seatUpgradeUsd: 50 },
    { name: 'Bob', flightCostUsd: 400, hotelShareUsd: 500, seatUpgradeUsd: 0 }
  ],
  depositPercentage = 20
}: {
  bundleTotalCostUsd?: number;
  packageDiscountUsd?: number;
  members?: Array<{ name: string; flightCostUsd?: number; hotelShareUsd?: number; seatUpgradeUsd?: number }>;
  depositPercentage?: number;
} = {}): {
  valid: boolean;
  bundleTotalCostUsd: number;
  packageDiscountUsd: number;
  netPackageCostUsd: number;
  depositPercentage: number;
  memberBreakdown: Record<string, { baseUsd: number; discountUsd: number; netTotalUsd: number; depositRequiredUsd: number }>;
  recommendation: string;
} {
  const cost = typeof bundleTotalCostUsd === 'number' && bundleTotalCostUsd > 0 ? bundleTotalCostUsd : 0;
  const discount = typeof packageDiscountUsd === 'number' && packageDiscountUsd >= 0 ? packageDiscountUsd : 0;
  const depositPct = typeof depositPercentage === 'number' && depositPercentage >= 0 ? depositPercentage : 20;

  if (cost === 0 || !Array.isArray(members) || members.length === 0) {
    return {
      valid: false,
      bundleTotalCostUsd: 0,
      packageDiscountUsd: 0,
      netPackageCostUsd: 0,
      depositPercentage: depositPct,
      memberBreakdown: {},
      recommendation: 'Valid bundle cost and non-empty members array required.'
    };
  }

  let totalIndividualBaseCost = 0;
  const rawMemberMap = members.map(m => {
    const flight = typeof m.flightCostUsd === 'number' && m.flightCostUsd > 0 ? m.flightCostUsd : 0;
    const hotel = typeof m.hotelShareUsd === 'number' && m.hotelShareUsd > 0 ? m.hotelShareUsd : 0;
    const upgrade = typeof m.seatUpgradeUsd === 'number' && m.seatUpgradeUsd > 0 ? m.seatUpgradeUsd : 0;
    const baseUsd = flight + hotel + upgrade;
    totalIndividualBaseCost += baseUsd;
    return { name: m.name || 'Member', baseUsd };
  });

  const netPackageCostUsd = Math.max(0, Math.round((cost - discount) * 100) / 100);
  const memberBreakdown: Record<string, { baseUsd: number; discountUsd: number; netTotalUsd: number; depositRequiredUsd: number }> = {};

  rawMemberMap.forEach(m => {
    const ratio = totalIndividualBaseCost > 0 ? m.baseUsd / totalIndividualBaseCost : 1 / members.length;
    const memberDiscount = Math.round(discount * ratio * 100) / 100;
    const netTotalUsd = Math.round((m.baseUsd - memberDiscount) * 100) / 100;
    const depositRequiredUsd = Math.round((netTotalUsd * (depositPct / 100)) * 100) / 100;

    memberBreakdown[m.name] = {
      baseUsd: m.baseUsd,
      discountUsd: memberDiscount,
      netTotalUsd,
      depositRequiredUsd
    };
  });

  return {
    valid: true,
    bundleTotalCostUsd: cost,
    packageDiscountUsd: discount,
    netPackageCostUsd,
    depositPercentage: depositPct,
    memberBreakdown,
    recommendation: `Bundle package cost of $${netPackageCostUsd.toFixed(2)} split across ${members.length} members (${depositPct}% deposit required at booking).`
  };
}

export function calculateGroupTripExpenseSettleUpPlan(
  participants: Array<{ name: string; totalPaidUsd: number; targetShareUsd?: number }>
): {
  valid: boolean;
  totalTripExpenseUsd: number;
  minimalTransactions: Array<{ from: string; to: string; amountUsd: number }>;
  transactionCount: number;
  isBalanced: boolean;
  error?: string;
  recommendation: string;
} {
  if (!Array.isArray(participants) || participants.length === 0) {
    return {
      valid: false,
      totalTripExpenseUsd: 0,
      minimalTransactions: [],
      transactionCount: 0,
      isBalanced: false,
      error: 'Participants array must be non-empty.',
      recommendation: 'Valid non-empty participants array required.'
    };
  }

  const totalTripExpenseUsd = participants.reduce((sum, p) => sum + (typeof p.totalPaidUsd === 'number' && p.totalPaidUsd > 0 ? p.totalPaidUsd : 0), 0);
  const equalShare = totalTripExpenseUsd / participants.length;

  const netBalances = participants.map(p => {
    const paid = typeof p.totalPaidUsd === 'number' && p.totalPaidUsd > 0 ? p.totalPaidUsd : 0;
    const target = typeof p.targetShareUsd === 'number' && p.targetShareUsd >= 0 ? p.targetShareUsd : equalShare;
    return {
      name: p.name || 'Member',
      net: paid - target
    };
  });

  const debtors = netBalances.filter(b => b.net < -0.01).map(b => ({ name: b.name, amount: -b.net }));
  const creditors = netBalances.filter(b => b.net > 0.01).map(b => ({ name: b.name, amount: b.net }));

  const minimalTransactions: Array<{ from: string; to: string; amountUsd: number }> = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount);
    if (payment > 0.01) {
      minimalTransactions.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amountUsd: Math.round(payment * 100) / 100
      });
    }

    debtors[i].amount -= payment;
    creditors[j].amount -= payment;

    if (debtors[i].amount <= 0.01) i++;
    if (creditors[j].amount <= 0.01) j++;
  }

  return {
    valid: true,
    totalTripExpenseUsd: Math.round(totalTripExpenseUsd * 100) / 100,
    minimalTransactions,
    transactionCount: minimalTransactions.length,
    isBalanced: true,
    recommendation: minimalTransactions.length === 0
      ? 'All group balances are settled up perfectly.'
      : `Group expenses totaling $${totalTripExpenseUsd.toFixed(2)} settled via ${minimalTransactions.length} minimal transactions.`
  };
}

export interface GroupExpenseItem {
  id?: string;
  payerName?: string;
  amountUsd?: number;
  hasReceipt?: boolean;
  isConfirmed?: boolean;
}

export function calculateGroupTripExpenseReconciliationAudit({
  expenses = [],
  totalMembersCount = 4,
  requiredReceiptThresholdUsd = 50
}: {
  expenses?: GroupExpenseItem[];
  totalMembersCount?: number;
  requiredReceiptThresholdUsd?: number;
} = {}) {
  if (!Array.isArray(expenses)) {
    return { valid: false, error: 'Expenses must be an array' };
  }
  if (typeof totalMembersCount !== 'number' || totalMembersCount <= 0) {
    return { valid: false, error: 'Total members count must be a positive number' };
  }

  let totalTripExpenseUsd = 0;
  let unverifiedExpenseUsd = 0;
  let missingReceiptsCount = 0;
  let confirmedExpensesCount = 0;

  for (const exp of expenses) {
    if (!exp || typeof exp.amountUsd !== 'number' || exp.amountUsd <= 0) continue;
    totalTripExpenseUsd += exp.amountUsd;

    if (!exp.hasReceipt && exp.amountUsd >= requiredReceiptThresholdUsd) {
      missingReceiptsCount++;
      unverifiedExpenseUsd += exp.amountUsd;
    }

    if (exp.isConfirmed) {
      confirmedExpensesCount++;
    }
  }

  totalTripExpenseUsd = Math.round(totalTripExpenseUsd * 100) / 100;
  unverifiedExpenseUsd = Math.round(unverifiedExpenseUsd * 100) / 100;
  const verifiedExpenseUsd = Math.round((totalTripExpenseUsd - unverifiedExpenseUsd) * 100) / 100;

  const perPersonShareUsd = Math.round((totalTripExpenseUsd / totalMembersCount) * 100) / 100;
  const verificationRatio = expenses.length > 0 ? (expenses.length - missingReceiptsCount) / expenses.length : 1;
  const confirmationRatio = expenses.length > 0 ? confirmedExpensesCount / expenses.length : 1;

  const reconciliationScore = Math.min(100, Math.max(0, Math.round(verificationRatio * 50 + confirmationRatio * 50)));

  let reconciliationTier = 'RECONCILED_AND_SETTLEMENT_READY';
  if (reconciliationScore < 60) reconciliationTier = 'UNBALANCED_MISSING_DOCUMENTATION';
  else if (reconciliationScore < 85) reconciliationTier = 'PENDING_FINAL_CONFIRMATION';

  return {
    valid: true,
    totalExpensesCount: expenses.length,
    totalTripExpenseUsd,
    verifiedExpenseUsd,
    unverifiedExpenseUsd,
    missingReceiptsCount,
    perPersonShareUsd,
    reconciliationScore,
    reconciliationTier,
    recommendation: reconciliationTier === 'RECONCILED_AND_SETTLEMENT_READY'
      ? `All trip expenses reconciled (${reconciliationScore}/100 score). Per-person share: $${perPersonShareUsd.toFixed(2)}. Ready for 1-click group settlement.`
      : reconciliationTier === 'UNBALANCED_MISSING_DOCUMENTATION'
      ? `Reconciliation score (${reconciliationScore}/100). ${missingReceiptsCount} expenses missing receipt documentation (>$${requiredReceiptThresholdUsd}).`
      : `Pending final member confirmation (${reconciliationScore}/100 score). $${verifiedExpenseUsd.toFixed(2)} verified.`
  };
}

export interface CategoryBudgetMap {
  [category: string]: { targetUsd: number; actualUsd: number };
}

export function calculateGroupTripBudgetVarianceAudit({
  categoryBudgets = {},
  totalMembersCount = 4
}: {
  categoryBudgets?: CategoryBudgetMap;
  totalMembersCount?: number;
} = {}) {
  if (typeof categoryBudgets !== 'object' || categoryBudgets === null) {
    return { valid: false, error: 'Category budgets must be a valid object' };
  }
  if (typeof totalMembersCount !== 'number' || totalMembersCount <= 0) {
    return { valid: false, error: 'Total members count must be a positive number' };
  }

  let totalTargetUsd = 0;
  let totalActualUsd = 0;
  const overBudgetCategories: Array<{ category: string; targetUsd: number; actualUsd: number; overageUsd: number }> = [];

  for (const [cat, data] of Object.entries(categoryBudgets)) {
    if (!data) continue;
    const target = typeof data.targetUsd === 'number' && data.targetUsd >= 0 ? data.targetUsd : 0;
    const actual = typeof data.actualUsd === 'number' && data.actualUsd >= 0 ? data.actualUsd : 0;

    totalTargetUsd += target;
    totalActualUsd += actual;

    if (actual > target) {
      overBudgetCategories.push({
        category: cat,
        targetUsd: target,
        actualUsd: actual,
        overageUsd: Math.round((actual - target) * 100) / 100
      });
    }
  }

  totalTargetUsd = Math.round(totalTargetUsd * 100) / 100;
  totalActualUsd = Math.round(totalActualUsd * 100) / 100;

  if (totalTargetUsd === 0 && totalActualUsd === 0) {
    return { valid: false, error: 'No budget data provided to analyze' };
  }

  const netVarianceUsd = Math.round((totalActualUsd - totalTargetUsd) * 100) / 100;
  const variancePercentage = totalTargetUsd > 0 ? Math.round((netVarianceUsd / totalTargetUsd) * 100 * 100) / 100 : 0;

  const perPersonTargetUsd = Math.round((totalTargetUsd / totalMembersCount) * 100) / 100;
  const perPersonActualUsd = Math.round((totalActualUsd / totalMembersCount) * 100) / 100;

  let budgetStatusTier = 'UNDER_BUDGET';
  if (variancePercentage > 15) budgetStatusTier = 'SIGNIFICANT_OVERRUN';
  else if (variancePercentage > 0) budgetStatusTier = 'SLIGHT_OVERRUN';

  return {
    valid: true,
    totalTargetUsd,
    totalActualUsd,
    netVarianceUsd,
    variancePercentage,
    perPersonTargetUsd,
    perPersonActualUsd,
    overBudgetCategoriesCount: overBudgetCategories.length,
    overBudgetCategories,
    budgetStatusTier,
    recommendation: budgetStatusTier === 'UNDER_BUDGET'
      ? `Group trip spend ($${totalActualUsd.toFixed(2)}) is within target budget ($${totalTargetUsd.toFixed(2)}). Surplus: $${Math.abs(netVarianceUsd).toFixed(2)}.`
      : budgetStatusTier === 'SLIGHT_OVERRUN'
      ? `Minor budget overrun of ${variancePercentage}% ($${netVarianceUsd.toFixed(2)}). Over-budget in ${overBudgetCategories.length} category.`
      : `SIGNIFICANT BUDGET OVERRUN (+${variancePercentage}%, +$${netVarianceUsd.toFixed(2)}). Review ${overBudgetCategories.length} over-budget category allocations.`
  };
}

export function calculateGroupTripDynamicStayProRataSplit(
  totalCostUsd: number,
  totalTripNights: number,
  memberStays: Array<{ name: string; nightsAttended: number }>
): {
  valid: boolean;
  error?: string;
  totalCostUsd?: number;
  totalTripNights?: number;
  totalMemberNights?: number;
  costPerMemberNightUsd?: number;
  equalSplitPerPersonUsd?: number;
  memberBreakdown?: Array<{
    name: string;
    nightsAttended: number;
    proRataShareUsd: number;
    varianceVsEqualSplitUsd: number;
  }>;
} {
  if (typeof totalCostUsd !== 'number' || totalCostUsd <= 0) {
    return { valid: false, error: 'Total cost must be a positive number' };
  }
  if (typeof totalTripNights !== 'number' || totalTripNights <= 0) {
    return { valid: false, error: 'Total trip nights must be a positive number' };
  }
  if (!Array.isArray(memberStays) || memberStays.length === 0) {
    return { valid: false, error: 'Member stays array cannot be empty' };
  }

  let totalMemberNights = 0;
  const validStays: Array<{ name: string; nightsAttended: number }> = [];

  for (const m of memberStays) {
    if (!m || !m.name) continue;
    const nights = typeof m.nightsAttended === 'number' && m.nightsAttended > 0 ? Math.min(totalTripNights, m.nightsAttended) : 0;
    if (nights > 0) {
      totalMemberNights += nights;
      validStays.push({ name: m.name.trim(), nightsAttended: nights });
    }
  }

  if (validStays.length === 0 || totalMemberNights === 0) {
    return { valid: false, error: 'No valid member stay nights found' };
  }

  const costPerMemberNightUsd = Math.round((totalCostUsd / totalMemberNights) * 100) / 100;
  const equalSplitPerPersonUsd = Math.round((totalCostUsd / validStays.length) * 100) / 100;

  const memberBreakdown = validStays.map(m => {
    const proRataShareUsd = Math.round(costPerMemberNightUsd * m.nightsAttended * 100) / 100;
    const varianceVsEqualSplitUsd = Math.round((proRataShareUsd - equalSplitPerPersonUsd) * 100) / 100;
    return {
      name: m.name,
      nightsAttended: m.nightsAttended,
      proRataShareUsd,
      varianceVsEqualSplitUsd
    };
  });

  return {
    valid: true,
    totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    totalTripNights,
    totalMemberNights,
    costPerMemberNightUsd,
    equalSplitPerPersonUsd,
    memberBreakdown
  };
}

export function calculateGroupTripFlightBaggageShareSplit(
  totalBaggageFeesUsd: number,
  checkedBagsList: Array<{ name: string; checkedBagsCount: number; isOverweight?: boolean }>
): {
  valid: boolean;
  error?: string;
  totalBaggageFeesUsd?: number;
  totalCheckedBagsCount?: number;
  perBagCostUsd?: number;
  memberBaggageBreakdown?: Array<{
    name: string;
    checkedBagsCount: number;
    isOverweight: boolean;
    allocatedFeeUsd: number;
  }>;
} {
  if (typeof totalBaggageFeesUsd !== 'number' || totalBaggageFeesUsd <= 0) {
    return { valid: false, error: 'Total baggage fees must be a positive number' };
  }
  if (!Array.isArray(checkedBagsList) || checkedBagsList.length === 0) {
    return { valid: false, error: 'Checked bags list cannot be empty' };
  }

  let totalWeightedBags = 0;
  let totalCheckedBagsCount = 0;
  const processedMembers: Array<{ name: string; checkedBagsCount: number; isOverweight: boolean; weightFactor: number }> = [];

  for (const item of checkedBagsList) {
    if (!item || !item.name) continue;
    const count = typeof item.checkedBagsCount === 'number' && item.checkedBagsCount > 0 ? item.checkedBagsCount : 0;
    const isOverweight = Boolean(item.isOverweight);
    const weightFactor = count * (isOverweight ? 1.5 : 1.0);

    totalCheckedBagsCount += count;
    totalWeightedBags += weightFactor;

    processedMembers.push({
      name: item.name.trim(),
      checkedBagsCount: count,
      isOverweight,
      weightFactor
    });
  }

  if (processedMembers.length === 0 || totalWeightedBags === 0) {
    return { valid: false, error: 'No valid checked bags found' };
  }

  const perBagCostUsd = Math.round((totalBaggageFeesUsd / totalCheckedBagsCount) * 100) / 100;

  const memberBaggageBreakdown = processedMembers.map(m => {
    const allocatedFeeUsd = Math.round((totalBaggageFeesUsd * (m.weightFactor / totalWeightedBags)) * 100) / 100;
    return {
      name: m.name,
      checkedBagsCount: m.checkedBagsCount,
      isOverweight: m.isOverweight,
      allocatedFeeUsd
    };
  });

  return {
    valid: true,
    totalBaggageFeesUsd: Math.round(totalBaggageFeesUsd * 100) / 100,
    totalCheckedBagsCount,
    perBagCostUsd,
    memberBaggageBreakdown
  };
}

export function calculateGroupTripRentalCarFuelAndTollSplit(
  rentalFeeUsd: number = 300,
  fuelExpensesUsd: number = 80,
  tollsUsd: number = 40,
  participantsCount: number = 4,
  primaryDriverDiscountPct: number = 25
): {
  valid: boolean;
  error?: string;
  totalCarExpenseUsd?: number;
  perPersonStandardShareUsd?: number;
  driverShareUsd?: number;
  nonDriverShareUsd?: number;
  recommendation?: string;
} {
  if (typeof rentalFeeUsd !== 'number' || rentalFeeUsd < 0) {
    return { valid: false, error: 'Rental fee must be a non-negative number' };
  }
  if (typeof participantsCount !== 'number' || participantsCount <= 0) {
    return { valid: false, error: 'Participants count must be a positive integer' };
  }

  const fuel = typeof fuelExpensesUsd === 'number' && fuelExpensesUsd >= 0 ? fuelExpensesUsd : 0;
  const tolls = typeof tollsUsd === 'number' && tollsUsd >= 0 ? tollsUsd : 0;
  const discountPct = typeof primaryDriverDiscountPct === 'number' && primaryDriverDiscountPct >= 0 && primaryDriverDiscountPct <= 100 ? primaryDriverDiscountPct : 25;

  const totalCarExpenseUsd = Math.round((rentalFeeUsd + fuel + tolls) * 100) / 100;
  const perPersonStandardShareUsd = Math.round((totalCarExpenseUsd / participantsCount) * 100) / 100;

  if (participantsCount === 1) {
    return {
      valid: true,
      totalCarExpenseUsd,
      perPersonStandardShareUsd,
      driverShareUsd: totalCarExpenseUsd,
      nonDriverShareUsd: 0,
      recommendation: `Solo rental car total: $${totalCarExpenseUsd.toFixed(2)}.`
    };
  }

  const driverShareUsd = Math.round((perPersonStandardShareUsd * (1 - (discountPct / 100))) * 100) / 100;
  const driverSubsidy = perPersonStandardShareUsd - driverShareUsd;
  const nonDriverShareUsd = Math.round((perPersonStandardShareUsd + (driverSubsidy / (participantsCount - 1))) * 100) / 100;

  return {
    valid: true,
    totalCarExpenseUsd,
    perPersonStandardShareUsd,
    driverShareUsd,
    nonDriverShareUsd,
    recommendation: `Rental car total $${totalCarExpenseUsd.toFixed(2)}. Designated driver pays $${driverShareUsd.toFixed(2)} (${discountPct}% discount), non-drivers pay $${nonDriverShareUsd.toFixed(2)} each.`
  };
}

export function calculateGroupTripAccommodationDepositProration({
  totalDepositUsd = 500,
  totalStayNights = 5,
  guests = [
    { name: 'Alice', nightsStayed: 5, roomTierMultiplier: 1.5 },
    { name: 'Bob', nightsStayed: 3, roomTierMultiplier: 1.0 }
  ]
}: {
  totalDepositUsd?: number;
  totalStayNights?: number;
  guests?: Array<{ name: string; nightsStayed?: number; roomTierMultiplier?: number }>;
} = {}): {
  valid: boolean;
  error?: string;
  totalDepositUsd?: number;
  totalStayNights?: number;
  perGuestDepositShareMap?: Record<string, number>;
  recommendation?: string;
} {
  const deposit = typeof totalDepositUsd === 'number' && totalDepositUsd > 0 ? totalDepositUsd : 0;
  const nights = typeof totalStayNights === 'number' && totalStayNights > 0 ? totalStayNights : 1;

  if (deposit === 0 || !Array.isArray(guests) || guests.length === 0) {
    return {
      valid: false,
      error: 'Valid positive total deposit and non-empty guests list required'
    };
  }

  let totalWeights = 0;
  const processed = guests.map(g => {
    const gNights = typeof g.nightsStayed === 'number' && g.nightsStayed > 0 ? Math.min(nights, g.nightsStayed) : 1;
    const mult = typeof g.roomTierMultiplier === 'number' && g.roomTierMultiplier > 0 ? g.roomTierMultiplier : 1.0;
    const weight = gNights * mult;
    totalWeights += weight;
    return { name: g.name || 'Guest', weight };
  });

  if (totalWeights === 0) {
    return { valid: false, error: 'Total guest weights cannot be zero' };
  }

  const perGuestDepositShareMap: Record<string, number> = {};
  for (const item of processed) {
    perGuestDepositShareMap[item.name] = Math.round((deposit * (item.weight / totalWeights)) * 100) / 100;
  }

  return {
    valid: true,
    totalDepositUsd: deposit,
    totalStayNights: nights,
    perGuestDepositShareMap,
    recommendation: `Accommodation deposit of $${deposit.toFixed(2)} prorated across ${guests.length} guest(s) based on stay duration and room tier.`
  };
}

export function calculateGroupTravelStaggeredPaymentSchedule({
  totalBookingAmountUsd = 1200,
  memberCount = 4,
  installmentPhasesCount = 3
}: {
  totalBookingAmountUsd?: number;
  memberCount?: number;
  installmentPhasesCount?: number;
} = {}): {
  valid: boolean;
  error?: string;
  totalBookingAmountUsd?: number;
  memberCount?: number;
  installmentPhasesCount?: number;
  perMemberTotalUsd?: number;
  perMemberPerPhaseUsd?: number;
  recommendation?: string;
} {
  const amount = typeof totalBookingAmountUsd === 'number' && totalBookingAmountUsd > 0 ? totalBookingAmountUsd : 0;
  const members = typeof memberCount === 'number' && memberCount > 0 ? Math.floor(memberCount) : 0;
  const phases = typeof installmentPhasesCount === 'number' && installmentPhasesCount > 0 ? Math.floor(installmentPhasesCount) : 1;

  if (amount === 0 || members === 0) {
    return {
      valid: false,
      error: 'Valid positive total booking amount and member count required'
    };
  }

  const perMemberTotalUsd = Math.round((amount / members) * 100) / 100;
  const perMemberPerPhaseUsd = Math.round((perMemberTotalUsd / phases) * 100) / 100;

  return {
    valid: true,
    totalBookingAmountUsd: amount,
    memberCount: members,
    installmentPhasesCount: phases,
    perMemberTotalUsd,
    perMemberPerPhaseUsd,
    recommendation: `Staggered payment schedule: $${perMemberTotalUsd.toFixed(2)}/person split across ${phases} phase(s) ($${perMemberPerPhaseUsd.toFixed(2)}/phase).`
  };
}

export function calculateGroupTripCurrencyConversionAndFeeProration({
  foreignAmount = 500,
  exchangeRate = 1.08,
  cardForeignFeePct = 3.0,
  participantsCount = 4
}: {
  foreignAmount?: number;
  exchangeRate?: number;
  cardForeignFeePct?: number;
  participantsCount?: number;
} = {}): {
  valid: boolean;
  error?: string;
  foreignAmount?: number;
  exchangeRate?: number;
  cardForeignFeePct?: number;
  participantsCount?: number;
  baseHomeCurrencyUsd?: number;
  feeAmountUsd?: number;
  totalGroupHomeCurrencyUsd?: number;
  perPersonTotalShareUsd?: number;
  recommendation?: string;
} {
  if (typeof foreignAmount !== 'number' || foreignAmount <= 0) {
    return { valid: false, error: 'Foreign amount must be a positive number' };
  }
  if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
    return { valid: false, error: 'Exchange rate must be a positive number' };
  }
  if (typeof participantsCount !== 'number' || participantsCount <= 0) {
    return { valid: false, error: 'Participants count must be a positive integer' };
  }

  const feePct = typeof cardForeignFeePct === 'number' && cardForeignFeePct >= 0 ? cardForeignFeePct : 0;
  const baseHomeCurrencyUsd = Math.round((foreignAmount * exchangeRate) * 100) / 100;
  const feeAmountUsd = Math.round((baseHomeCurrencyUsd * (feePct / 100)) * 100) / 100;
  const totalGroupHomeCurrencyUsd = Math.round((baseHomeCurrencyUsd + feeAmountUsd) * 100) / 100;
  const perPersonTotalShareUsd = Math.round((totalGroupHomeCurrencyUsd / participantsCount) * 100) / 100;

  return {
    valid: true,
    foreignAmount,
    exchangeRate,
    cardForeignFeePct: feePct,
    participantsCount,
    baseHomeCurrencyUsd,
    feeAmountUsd,
    totalGroupHomeCurrencyUsd,
    perPersonTotalShareUsd,
    recommendation: `Foreign expense of ${foreignAmount} converted to $${totalGroupHomeCurrencyUsd.toFixed(2)} USD (incl $${feeAmountUsd.toFixed(2)} FX fee), $${perPersonTotalShareUsd.toFixed(2)}/person.`
  };
}

export function calculateGroupFlightSeatUpgradeAllocation({
  baseTicketCostUsd = 400,
  upgradeFeeUsd = 120,
  upgradedParticipantsCount = 2,
  totalGroupSize = 4
}: {
  baseTicketCostUsd?: number;
  upgradeFeeUsd?: number;
  upgradedParticipantsCount?: number;
  totalGroupSize?: number;
} = {}): {
  valid: boolean;
  error?: string;
  baseTicketCostUsd?: number;
  upgradeFeeUsd?: number;
  upgradedParticipantsCount?: number;
  totalGroupSize?: number;
  standardMemberShareUsd?: number;
  upgradedMemberShareUsd?: number;
  totalGroupCostUsd?: number;
  recommendation?: string;
} {
  if (typeof baseTicketCostUsd !== 'number' || baseTicketCostUsd <= 0) {
    return { valid: false, error: 'Base ticket cost must be a positive number' };
  }
  if (typeof totalGroupSize !== 'number' || totalGroupSize <= 0) {
    return { valid: false, error: 'Total group size must be a positive integer' };
  }
  if (typeof upgradedParticipantsCount !== 'number' || upgradedParticipantsCount < 0 || upgradedParticipantsCount > totalGroupSize) {
    return { valid: false, error: 'Upgraded participants count cannot exceed total group size' };
  }

  const upgradeTotal = typeof upgradeFeeUsd === 'number' && upgradeFeeUsd >= 0 ? upgradeFeeUsd : 0;
  const standardMemberShareUsd = Math.round(baseTicketCostUsd * 100) / 100;
  const perPersonUpgradeShareUsd = upgradedParticipantsCount > 0 ? Math.round((upgradeTotal / upgradedParticipantsCount) * 100) / 100 : 0;
  const upgradedMemberShareUsd = Math.round((standardMemberShareUsd + perPersonUpgradeShareUsd) * 100) / 100;
  const totalGroupCostUsd = Math.round((baseTicketCostUsd * totalGroupSize + upgradeTotal) * 100) / 100;

  return {
    valid: true,
    baseTicketCostUsd,
    upgradeFeeUsd: upgradeTotal,
    upgradedParticipantsCount,
    totalGroupSize,
    standardMemberShareUsd,
    upgradedMemberShareUsd,
    totalGroupCostUsd,
    recommendation: upgradedParticipantsCount > 0
      ? `Standard share: $${standardMemberShareUsd.toFixed(2)}/person; Upgraded share: $${upgradedMemberShareUsd.toFixed(2)}/person (includes $${perPersonUpgradeShareUsd.toFixed(2)} upgrade fee).`
      : `All ${totalGroupSize} travelers pay standard fare $${standardMemberShareUsd.toFixed(2)}.`
  };
}

export function calculateGroupTripExpenseFairnessIndex(
  participantExpenses: number[],
  targetPerPersonShareUsd: number
): {
  valid: boolean;
  participantCount: number;
  totalGroupSpendUsd: number;
  averageSpendUsd: number;
  maxDisparityUsd: number;
  fairnessIndexScore: number;
  fairnessTier: string;
  recommendation: string;
  error?: string;
} {
  if (!Array.isArray(participantExpenses) || participantExpenses.length === 0) {
    return {
      valid: false,
      participantCount: 0,
      totalGroupSpendUsd: 0,
      averageSpendUsd: 0,
      maxDisparityUsd: 0,
      fairnessIndexScore: 0,
      fairnessTier: 'INVALID',
      recommendation: '',
      error: 'Participant expenses array cannot be empty'
    };
  }

  const validExpenses = participantExpenses.map(e => (typeof e === 'number' && e >= 0 ? e : 0));
  const totalGroupSpendUsd = Math.round(validExpenses.reduce((a, b) => a + b, 0) * 100) / 100;
  const count = validExpenses.length;
  const averageSpendUsd = Math.round((totalGroupSpendUsd / count) * 100) / 100;

  const minSpend = Math.min(...validExpenses);
  const maxSpend = Math.max(...validExpenses);
  const maxDisparityUsd = Math.round((maxSpend - minSpend) * 100) / 100;

  const target = typeof targetPerPersonShareUsd === 'number' && targetPerPersonShareUsd > 0 ? targetPerPersonShareUsd : averageSpendUsd;
  const varianceSum = validExpenses.reduce((sum, exp) => sum + Math.abs(exp - target), 0);
  const avgVariance = varianceSum / count;

  let fairnessIndexScore = Math.max(0, 100 - Math.round((avgVariance / (target || 1)) * 100));
  fairnessIndexScore = Math.min(100, fairnessIndexScore);

  let fairnessTier = 'EQUIVALENT_BALANCED';
  if (fairnessIndexScore < 60) {
    fairnessTier = 'HIGH_DISPARITY';
  } else if (fairnessIndexScore < 85) {
    fairnessTier = 'MODERATE_VARIANCE';
  }

  return {
    valid: true,
    participantCount: count,
    totalGroupSpendUsd,
    averageSpendUsd,
    maxDisparityUsd,
    fairnessIndexScore,
    fairnessTier,
    recommendation: fairnessIndexScore >= 85
      ? `Balanced group spending (${fairnessIndexScore}/100 fairness score). Expenses evenly distributed.`
      : `High spending variance (${fairnessIndexScore}/100 score). Max disparity: $${maxDisparityUsd.toFixed(2)}.`
  };
}

export function calculateCoBookMinTransfersSettlementScore({
  totalTripExpenseUsd = 1200,
  participantsCount = 4,
  calculatedTransactionsCount = 2,
  maxPossibleTransactionsCount = 6
}: {
  totalTripExpenseUsd?: number;
  participantsCount?: number;
  calculatedTransactionsCount?: number;
  maxPossibleTransactionsCount?: number;
} = {}): {
  valid: boolean;
  totalTripExpenseUsd: number;
  participantsCount: number;
  calculatedTransactionsCount: number;
  maxPossibleTransactionsCount: number;
  transferReductionPct: number;
  efficiencyScore: number;
  efficiencyTier: string;
  recommendation: string;
} {
  const expense = typeof totalTripExpenseUsd === 'number' && totalTripExpenseUsd > 0 ? totalTripExpenseUsd : 0;
  const count = typeof participantsCount === 'number' && participantsCount > 1 ? participantsCount : 0;

  if (expense === 0 || count === 0) {
    return {
      valid: false,
      totalTripExpenseUsd: 0,
      participantsCount: 0,
      calculatedTransactionsCount: 0,
      maxPossibleTransactionsCount: 0,
      transferReductionPct: 0,
      efficiencyScore: 0,
      efficiencyTier: 'INVALID_INPUT',
      recommendation: 'Valid trip expense and participants count (>1) are required.'
    };
  }

  const maxTx = Math.max(1, typeof maxPossibleTransactionsCount === 'number' && maxPossibleTransactionsCount > 0 ? maxPossibleTransactionsCount : count * (count - 1));
  const calcTx = Math.max(0, typeof calculatedTransactionsCount === 'number' ? calculatedTransactionsCount : 0);

  const transferReductionPct = Math.max(0, Math.round(((maxTx - calcTx) / maxTx) * 100 * 10) / 10);
  const efficiencyScore = Math.min(100, Math.max(0, Math.round((transferReductionPct / 100) * 100)));

  let efficiencyTier = 'HIGHLY_OPTIMIZED_SETTLEMENT';
  if (efficiencyScore < 50) {
    efficiencyTier = 'SUB_OPTIMAL_SETTLEMENT';
  } else if (efficiencyScore < 80) {
    efficiencyTier = 'MODERATE_SETTLEMENT_EFFICIENCY';
  }

  return {
    valid: true,
    totalTripExpenseUsd: expense,
    participantsCount: count,
    calculatedTransactionsCount: calcTx,
    maxPossibleTransactionsCount: maxTx,
    transferReductionPct,
    efficiencyScore,
    efficiencyTier,
    recommendation: `Group trip settlement optimized (${calcTx} transfer(s) vs ${maxTx} maximum, reducing transfers by ${transferReductionPct}%).`
  };
}

export function calculateCoBookRealtimeCursorSyncBandwidthScore({
  activeUsersCount = 5,
  cursorUpdatesPerSecondPerUser = 30,
  payloadSizeBytes = 64,
  networkLatencyMs = 45
}: {
  activeUsersCount?: number;
  cursorUpdatesPerSecondPerUser?: number;
  payloadSizeBytes?: number;
  networkLatencyMs?: number;
} = {}): {
  valid: boolean;
  error?: string;
  activeUsersCount?: number;
  totalKbitsPerSecond?: number;
  latencyMs?: number;
  syncQualityScore?: number;
  syncTier?: string;
  recommendation?: string;
} {
  if (typeof activeUsersCount !== 'number' || activeUsersCount <= 0) {
    return { valid: false, error: 'Active users count must be a positive integer' };
  }

  const updatesPerSec = typeof cursorUpdatesPerSecondPerUser === 'number' && cursorUpdatesPerSecondPerUser > 0 ? cursorUpdatesPerSecondPerUser : 30;
  const payloadBytes = typeof payloadSizeBytes === 'number' && payloadSizeBytes > 0 ? payloadSizeBytes : 64;
  const latency = typeof networkLatencyMs === 'number' && networkLatencyMs >= 0 ? networkLatencyMs : 50;

  const bytesPerSecond = activeUsersCount * updatesPerSec * payloadBytes;
  const totalKbitsPerSecond = Math.round((bytesPerSecond * 8 / 1000) * 100) / 100;

  let latencyScore = latency <= 50 ? 50 : latency <= 150 ? 30 : 10;
  let bandwidthScore = totalKbitsPerSecond <= 100 ? 50 : totalKbitsPerSecond <= 500 ? 35 : 15;
  const syncQualityScore = Math.min(100, latencyScore + bandwidthScore);

  let syncTier = 'OPTIMAL_REALTIME_SYNC';
  if (syncQualityScore < 50) {
    syncTier = 'LAGGY_CURSOR_SYNC';
  } else if (syncQualityScore < 80) {
    syncTier = 'ACCEPTABLE_SYNC_QUALITY';
  }

  return {
    valid: true,
    activeUsersCount,
    totalKbitsPerSecond,
    latencyMs: latency,
    syncQualityScore,
    syncTier,
    recommendation: syncQualityScore >= 80
      ? `Ultra-smooth multiplayer cursor sync across ${activeUsersCount} users (${totalKbitsPerSecond} kbps bandwidth, ${latency}ms latency).`
      : `Real-time cursor sync experiencing minor latency or high bandwidth usage (${totalKbitsPerSecond} kbps). Recommend throttling update rate.`
  };
}

export function calculateCoBookFlightHotelPackageDealSavings({
  flightStandaloneUsd = 400,
  hotelStandaloneUsd = 600,
  bundledPackagePriceUsd = 850,
  participantsCount = 2
}: {
  flightStandaloneUsd?: number;
  hotelStandaloneUsd?: number;
  bundledPackagePriceUsd?: number;
  participantsCount?: number;
} = {}): {
  valid: boolean;
  error?: string;
  totalStandaloneUsd?: number;
  bundledPackagePriceUsd?: number;
  totalSavingsUsd?: number;
  savingsPercentage?: number;
  perPersonPackagePriceUsd?: number;
  savingsTier?: string;
  recommendation?: string;
} {
  if (typeof flightStandaloneUsd !== 'number' || flightStandaloneUsd <= 0) {
    return { valid: false, error: 'Flight standalone cost must be a positive number' };
  }
  if (typeof hotelStandaloneUsd !== 'number' || hotelStandaloneUsd <= 0) {
    return { valid: false, error: 'Hotel standalone cost must be a positive number' };
  }
  if (typeof bundledPackagePriceUsd !== 'number' || bundledPackagePriceUsd <= 0) {
    return { valid: false, error: 'Bundled package price must be a positive number' };
  }

  const members = typeof participantsCount === 'number' && participantsCount > 0 ? Math.floor(participantsCount) : 1;
  const totalStandaloneUsd = Math.round((flightStandaloneUsd + hotelStandaloneUsd) * 100) / 100;
  const totalSavingsUsd = Math.max(0, Math.round((totalStandaloneUsd - bundledPackagePriceUsd) * 100) / 100);
  const savingsPercentage = Math.round((totalSavingsUsd / totalStandaloneUsd) * 100 * 10) / 10;
  const perPersonPackagePriceUsd = Math.round((bundledPackagePriceUsd / members) * 100) / 100;

  let savingsTier = 'HIGH_VALUE_BUNDLE_DEAL';
  if (totalSavingsUsd === 0) {
    savingsTier = 'NO_PACKAGE_SAVINGS';
  } else if (savingsPercentage < 10) {
    savingsTier = 'MODERATE_BUNDLE_SAVINGS';
  }

  return {
    valid: true,
    totalStandaloneUsd,
    bundledPackagePriceUsd,
    totalSavingsUsd,
    savingsPercentage,
    perPersonPackagePriceUsd,
    savingsTier,
    recommendation: totalSavingsUsd > 0
      ? `Package bundle saves $${totalSavingsUsd.toFixed(2)} (${savingsPercentage}% savings vs standalone flights & hotel). $${perPersonPackagePriceUsd.toFixed(2)}/person.`
      : `No bundle discount found ($${totalStandaloneUsd.toFixed(2)} total). Standalone bookings recommended.`
  };
}














