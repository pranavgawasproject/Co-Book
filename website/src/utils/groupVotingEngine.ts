/**
 * groupVotingEngine.ts
 * Utility engine to compute group voting consensus for multiplayer travel itineraries,
 * resolve voting deadlocks, and calculate budget variance per participant.
 */

export interface ItineraryProposal {
  id: string;
  title: string;
  pricePerPerson: number;
  provider: string;
}

export interface UserVote {
  userId: string;
  proposalId: string;
  weight?: number; // 1-5 preference rating
}

export interface ConsensusResult {
  winningProposalId: string | null;
  proposalScores: Record<string, { totalPoints: number; approvalPercentage: number; voteCount: number }>;
  hasTie: boolean;
  isConsensusReached: boolean;
}

export interface BudgetVarianceResult {
  proposalId: string;
  averageVariance: number;
  overbudgetCount: number;
  isAffordableForGroup: boolean;
}

/**
 * Computes group voting consensus score for travel itinerary proposals.
 */
export function calculateGroupVotingConsensus(
  proposals: ItineraryProposal[] = [],
  votes: UserVote[] = [],
  totalParticipants: number = 1
): ConsensusResult {
  if (proposals.length === 0 || votes.length === 0) {
    return {
      winningProposalId: null,
      proposalScores: {},
      hasTie: false,
      isConsensusReached: false
    };
  }

  const scores: Record<string, { totalPoints: number; approvalPercentage: number; voteCount: number }> = {};

  proposals.forEach(p => {
    scores[p.id] = { totalPoints: 0, approvalPercentage: 0, voteCount: 0 };
  });

  votes.forEach(vote => {
    if (scores[vote.proposalId]) {
      const weight = Math.max(1, Math.min(5, vote.weight ?? 3));
      scores[vote.proposalId].totalPoints += weight;
      scores[vote.proposalId].voteCount += 1;
    }
  });

  const safeParticipants = Math.max(1, totalParticipants);
  let highestScore = -1;
  let winningId: string | null = null;
  let topCount = 0;

  for (const [id, data] of Object.entries(scores)) {
    data.approvalPercentage = Number(((data.voteCount / safeParticipants) * 100).toFixed(1));
    if (data.totalPoints > highestScore) {
      highestScore = data.totalPoints;
      winningId = id;
      topCount = 1;
    } else if (data.totalPoints === highestScore && highestScore > 0) {
      topCount += 1;
    }
  }

  const hasTie = topCount > 1;
  const winnerScore = winningId ? scores[winningId] : null;
  const isConsensusReached = !hasTie && winnerScore !== null && winnerScore.approvalPercentage >= 50;

  return {
    winningProposalId: hasTie ? null : winningId,
    proposalScores: scores,
    hasTie,
    isConsensusReached
  };
}

/**
 * Calculates budget variance per proposal against participant budget caps.
 */
export function computeGroupBudgetVariance(
  proposal: ItineraryProposal,
  participantBudgets: Record<string, number> = {}
): BudgetVarianceResult {
  const budgets = Object.values(participantBudgets);
  if (!proposal || budgets.length === 0) {
    return {
      proposalId: proposal?.id ?? '',
      averageVariance: 0,
      overbudgetCount: 0,
      isAffordableForGroup: true
    };
  }

  let totalDiff = 0;
  let overbudgetCount = 0;

  budgets.forEach(budget => {
    const diff = proposal.pricePerPerson - budget;
    totalDiff += diff;
    if (diff > 0) {
      overbudgetCount += 1;
    }
  });

  const averageVariance = Number((totalDiff / budgets.length).toFixed(2));
  const isAffordableForGroup = overbudgetCount === 0;

  return {
    proposalId: proposal.id,
    averageVariance,
    overbudgetCount,
    isAffordableForGroup
  };
}
