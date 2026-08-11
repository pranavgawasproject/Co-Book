/**
 * Safely convert dollar/rupee amount to total cents to avoid floating point precision issues.
 */
function toCents(amount) {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Calculate equal expense split share for group members.
 * Returns base per-person share rounded to 2 decimal places and remainder.
 */
export function calculateEqualSplit(totalAmount, memberCount) {
  if (memberCount <= 0 || isNaN(memberCount) || !isFinite(memberCount) || totalAmount <= 0) {
    return { perPersonShare: 0, remainderCents: 0 };
  }

  const totalCents = toCents(totalAmount);
  const count = Math.floor(memberCount);
  const baseShareCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseShareCents * count;

  return {
    perPersonShare: baseShareCents / 100,
    remainderCents: remainderCents / 100
  };
}

/**
 * Calculate individual member shares for equal splits, distributing remainder cents
 * so that sum(shares) equals totalAmount EXACTLY without cents losing/overcharging.
 */
export function calculateEqualShares(totalAmount, memberCount) {
  if (memberCount <= 0 || isNaN(memberCount) || !isFinite(memberCount) || totalAmount <= 0) {
    return Array(Math.max(0, Math.floor(memberCount) || 0)).fill(0);
  }

  const totalCents = toCents(totalAmount);
  const count = Math.floor(memberCount);
  const baseShareCents = Math.floor(totalCents / count);
  let remainderCents = totalCents - baseShareCents * count;

  const sharesInCents = [];
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
 */
export function calculatePercentageSplit(totalAmount, percentages, distributeRemainder = true) {
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
 */
export function calculateWeightedSplit(totalAmount, weights, distributeRemainder = true) {
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

function getDefaultLocale(currency) {
  const code = (currency || 'USD').toUpperCase();
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
export function formatCurrency(amount, currency = 'INR', locale = null) {
  const numericAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  const targetLocale = locale || getDefaultLocale(currency);

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: (currency || 'INR').toUpperCase(),
      maximumFractionDigits: (currency || 'INR').toUpperCase() === 'JPY' ? 0 : 2
    }).format(numericAmount);
  } catch (_) {
    const symbol = (currency || 'INR').toUpperCase() === 'INR' ? '₹' : '$';
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
}

export function calculateMultiCurrencyConversion(
  amount,
  fromCurrency,
  toCurrency,
  exchangeRates = {}
) {
  if (isNaN(amount) || amount <= 0 || !fromCurrency || !toCurrency) return 0;
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;

  const defaultRates = {
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

export function simplifyGroupBalances(netBalances) {
  if (!Array.isArray(netBalances) || netBalances.length === 0) return [];

  const debtors = [];
  const creditors = [];

  for (const item of netBalances) {
    const rounded = Math.round(item.netAmount * 100) / 100;
    if (rounded < 0) {
      debtors.push({ member: item.member, amount: Math.abs(rounded) });
    } else if (rounded > 0) {
      creditors.push({ member: item.member, amount: rounded });
    }
  }

  const transactions = [];
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

export function validateGroupSplitInput(totalAmount, memberNames) {
  const errors = [];
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

export function calculateTipAndTaxDistributions(baseAmount, taxAmount, tipAmount, memberShares) {
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

export function generateCollaborativeSessionToken(tripId, userId) {
  if (!tripId || !userId || typeof tripId !== 'string' || typeof userId !== 'string') {
    return '';
  }
  const cleanTrip = tripId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUser = userId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTrip || !cleanUser) return '';
  return `sync_${cleanTrip}_${cleanUser}`;
}

export function calculateCategorySpendingBreakdown(expenses) {
  if (!Array.isArray(expenses)) return {};
  const breakdown = {};

  for (const exp of expenses) {
    if (!exp) continue;
    const cat = (exp.category && exp.category.trim()) || 'General';
    const amt = typeof exp.amount === 'number' && !isNaN(exp.amount) && exp.amount > 0 ? exp.amount : 0;
    breakdown[cat] = Math.round(((breakdown[cat] || 0) + amt) * 100) / 100;
  }

  return breakdown;
}

export function calculateBudgetPerPersonCap(totalBudget, memberCount, maxCapPerPerson) {
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

export function calculateGroupBudgetVelocity(expenses, totalBudget, elapsedDays, totalTripDays) {
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

export function calculateGroupSettleUpPlan(balances) {
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

export function calculateGroupExpenseFairnessIndex(balances) {
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

  const avgImbalancePerPerson = totalAbsNet / entries.length;
  const rawScore = Math.max(0, 100 - Math.round(avgImbalancePerPerson * 0.5));
  const fairnessScore = Math.min(100, rawScore);

  let rating = 'Highly Balanced';
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

export function calculateGroupDepositEscrowShares(expenses, depositTotal, memberCount) {
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

export function calculateGroupFlightSeatUpgradeShare(baseFlightTotal, upgradeFeeTotal, totalMembers, upgradedMemberCount) {
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

export function calculateTripCurrencyConversionRate(amount, exchangeRate, platformFeePercentage = 0) {
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

export function calculateGroupCustomRatioSplit(totalAmount, ratios) {
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

export function calculateCoBookingDiscountShare(totalOrderAmount, discountPercentage, participantCount) {
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

export function calculateGroupFlightVsHotelSplitRatio(flightTotal, hotelTotal, participantCount) {
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

export function calculateCoBookDamageDepositEscrowSplit(params = {}) {
  const {
    totalDepositUsd = 0,
    participantsList = [],
    merchantRefundedAmountUsd = 0,
    fxConversionFeePct = 0
  } = params;

  if (typeof totalDepositUsd !== 'number' || totalDepositUsd <= 0 || !Array.isArray(participantsList) || participantsList.length === 0) {
    return {
      valid: false,
      error: 'Total deposit must be greater than zero and participants list must not be empty',
      participantsCount: 0,
      totalDepositUsd: 0,
      netRefundedUsd: 0,
      totalDeductionsUsd: 0,
      participantRefundBreakdown: [],
      splitTier: 'INVALID_INPUT',
      recommendation: 'Provide valid deposit amount and participant list.'
    };
  }

  const numPeople = participantsList.length;
  const equalDepositShareUsd = Math.round((totalDepositUsd / numPeople) * 100) / 100;

  const totalDamageDeductionsUsd = participantsList.reduce((sum, p) => sum + (p.roomDamageDeductionUsd || 0), 0);
  const fxFeeDeductionUsd = Math.round((totalDepositUsd * (fxConversionFeePct / 100)) * 100) / 100;

  const netRefundedUsd = Math.round((merchantRefundedAmountUsd - fxFeeDeductionUsd) * 100) / 100;
  const totalLossUsd = Math.round((totalDepositUsd - netRefundedUsd) * 100) / 100;

  const participantRefundBreakdown = participantsList.map(p => {
    const baseShare = p.depositShareUsd || equalDepositShareUsd;
    const roomDamage = p.roomDamageDeductionUsd || 0;

    const unexplainedLossUsd = Math.max(0, totalLossUsd - totalDamageDeductionsUsd);
    const sharedLossPerPerson = Math.round((unexplainedLossUsd / numPeople) * 100) / 100;

    const netRefundUsd = Math.max(0, Math.round((baseShare - roomDamage - sharedLossPerPerson) * 100) / 100);

    return {
      name: p.name,
      depositShareUsd: baseShare,
      roomDamageDeductionUsd: roomDamage,
      sharedLossShareUsd: sharedLossPerPerson,
      netRefundUsd
    };
  });

  let splitTier = 'FULL_SECURITY_DEPOSIT_REFUND';
  if (totalDamageDeductionsUsd > 0) {
    splitTier = 'ITEMIZED_ROOM_DAMAGE_DEDUCTION';
  } else if (totalLossUsd > 0) {
    splitTier = 'FX_OR_PLATFORM_HOLDBACK_LOSS';
  }

  return {
    valid: true,
    participantsCount: numPeople,
    totalDepositUsd: Math.round(totalDepositUsd * 100) / 100,
    merchantRefundedAmountUsd: Math.round(merchantRefundedAmountUsd * 100) / 100,
    netRefundedUsd,
    totalDeductionsUsd: Math.round((totalDamageDeductionsUsd + fxFeeDeductionUsd) * 100) / 100,
    participantRefundBreakdown,
    splitTier,
    recommendation: splitTier === 'FULL_SECURITY_DEPOSIT_REFUND'
      ? `Full security deposit of $${totalDepositUsd.toFixed(2)} refunded equally among ${numPeople} members.`
      : splitTier === 'ITEMIZED_ROOM_DAMAGE_DEDUCTION'
      ? `Security deposit settlement: $${netRefundedUsd.toFixed(2)} refunded net of $${totalDamageDeductionsUsd.toFixed(2)} itemized damage deductions.`
      : `Deposit settlement alert: $${totalLossUsd.toFixed(2)} platform holdback/FX loss prorated across group.`
  };
}


