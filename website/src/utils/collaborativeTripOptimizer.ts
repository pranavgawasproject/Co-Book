/**
 * Co-Book Collaborative Trip Budget & Consensus Utility
 * Evaluates group member budget constraints, room allocations, and flight preferences
 * to optimize overall group travel cost and consensus agreement.
 */

export interface GroupMemberBudget {
  userId: string;
  name: string;
  maxBudgetUsd: number;
  preferredRoomType?: 'SINGLE' | 'SHARED';
}

export interface TripPackageOption {
  packageId: string;
  title: string;
  totalFlightCost: number;
  totalHotelCost: number;
  totalActivityCost: number;
  singleRoomPremium?: number;
}

export interface CollaborativeTripOptimizationResult {
  packageId: string;
  totalGroupCost: number;
  perPersonCost: number; // Base or average cost if identical
  consensusScore: number; // 0 - 100
  isWithinAllBudgets: boolean;
  budgetDeficitUsers: string[];
  recommendations: string[];
  perPersonBreakdown: Record<string, number>;
}

export function calculateCollaborativeTripOptimization({
  members = [],
  tripPackage = { packageId: 'default', title: 'Standard Package', totalFlightCost: 0, totalHotelCost: 0, totalActivityCost: 0 }
}: {
  members: GroupMemberBudget[];
  tripPackage: TripPackageOption;
}): CollaborativeTripOptimizationResult {
  const memberCount = members.length;

  if (memberCount === 0) {
    return {
      packageId: tripPackage.packageId,
      totalGroupCost: 0,
      perPersonCost: 0,
      consensusScore: 0,
      isWithinAllBudgets: true,
      budgetDeficitUsers: [],
      recommendations: ['No group members provided for optimization.'],
      perPersonBreakdown: {}
    };
  }

  const totalGroupCost = tripPackage.totalFlightCost + tripPackage.totalHotelCost + tripPackage.totalActivityCost;

  const singleCount = members.filter(m => m.preferredRoomType === 'SINGLE').length;
  let premium = tripPackage.singleRoomPremium || 0;
  
  // Ensure premium doesn't exceed total hotel cost logically
  if (premium * singleCount > tripPackage.totalHotelCost) {
    premium = tripPackage.totalHotelCost / (singleCount || 1);
  }
  
  const baseTotalCost = totalGroupCost - (singleCount * premium);
  const basePerPersonCost = baseTotalCost / memberCount;

  const perPersonBreakdown: Record<string, number> = {};
  
  const budgetDeficitUsers: string[] = [];
  let budgetSatisfactionSum = 0;

  members.forEach(m => {
    let cost = basePerPersonCost;
    if (m.preferredRoomType === 'SINGLE') {
      cost += premium;
    }
    const roundedCost = Math.round(cost * 100) / 100;
    perPersonBreakdown[m.userId] = roundedCost;

    if (roundedCost > m.maxBudgetUsd) {
      budgetDeficitUsers.push(m.name || m.userId);
      const ratio = m.maxBudgetUsd / roundedCost;
      budgetSatisfactionSum += ratio * 100;
    } else {
      budgetSatisfactionSum += 100;
    }
  });

  const isWithinAllBudgets = budgetDeficitUsers.length === 0;
  const consensusScore = Math.round(budgetSatisfactionSum / memberCount);

  const averagePerPersonCost = Math.round((totalGroupCost / memberCount) * 100) / 100;

  const recommendations: string[] = [];
  if (!isWithinAllBudgets) {
    recommendations.push(
      `Package price exceeds budget for: ${budgetDeficitUsers.join(', ')}. Consider adjusting hotel tier or applying a package discount.`
    );
  } else {
    recommendations.push(`Package is fully affordable for all ${memberCount} group members.`);
  }

  if (singleCount > 0 && premium > 0) {
    recommendations.push(`Applied single room premium of $${premium.toFixed(2)} for ${singleCount} member(s).`);
  }

  return {
    packageId: tripPackage.packageId,
    totalGroupCost,
    perPersonCost: averagePerPersonCost,
    consensusScore,
    isWithinAllBudgets,
    budgetDeficitUsers,
    recommendations,
    perPersonBreakdown
  };
}
