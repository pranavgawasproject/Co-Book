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
