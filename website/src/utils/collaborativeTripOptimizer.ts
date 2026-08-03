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
}

export interface CollaborativeTripOptimizationResult {
  packageId: string;
  totalGroupCost: number;
  perPersonCost: number;
  consensusScore: number; // 0 - 100
  isWithinAllBudgets: boolean;
  budgetDeficitUsers: string[];
  recommendations: string[];
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
      recommendations: ['No group members provided for optimization.']
    };
  }

  const totalGroupCost = tripPackage.totalFlightCost + tripPackage.totalHotelCost + tripPackage.totalActivityCost;
  const perPersonCost = Math.round((totalGroupCost / memberCount) * 100) / 100;

  const budgetDeficitUsers: string[] = [];
  let budgetSatisfactionSum = 0;

  members.forEach(m => {
    if (perPersonCost > m.maxBudgetUsd) {
      budgetDeficitUsers.push(m.name || m.userId);
      const ratio = m.maxBudgetUsd / perPersonCost;
      budgetSatisfactionSum += ratio * 100;
    } else {
      budgetSatisfactionSum += 100;
    }
  });

  const isWithinAllBudgets = budgetDeficitUsers.length === 0;
  const consensusScore = Math.round(budgetSatisfactionSum / memberCount);

  const recommendations: string[] = [];
  if (!isWithinAllBudgets) {
    recommendations.push(
      `Package price ($${perPersonCost.toFixed(2)}/person) exceeds budget for: ${budgetDeficitUsers.join(', ')}. Consider adjusting hotel tier or applying a package discount.`
    );
  } else {
    recommendations.push(`Package is fully affordable for all ${memberCount} group members.`);
  }

  return {
    packageId: tripPackage.packageId,
    totalGroupCost,
    perPersonCost,
    consensusScore,
    isWithinAllBudgets,
    budgetDeficitUsers,
    recommendations
  };
}
