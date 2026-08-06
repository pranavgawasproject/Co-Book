import { describe, it, expect } from 'vitest';
import {
  calculateGroupVotingConsensus,
  computeGroupBudgetVariance,
  ItineraryProposal,
  UserVote
} from '../groupVotingEngine';

describe('groupVotingEngine', () => {
  const proposals: ItineraryProposal[] = [
    { id: 'prop-1', title: 'Beach Villa Bali', pricePerPerson: 450, provider: 'Booking.com' },
    { id: 'prop-2', title: 'Mountain Resort Swiss', pricePerPerson: 850, provider: 'Airbnb' }
  ];

  it('calculates clear winning proposal when majority votes', () => {
    const votes: UserVote[] = [
      { userId: 'u1', proposalId: 'prop-1', weight: 5 },
      { userId: 'u2', proposalId: 'prop-1', weight: 4 },
      { userId: 'u3', proposalId: 'prop-2', weight: 3 }
    ];

    const result = calculateGroupVotingConsensus(proposals, votes, 3);
    expect(result.winningProposalId).toBe('prop-1');
    expect(result.hasTie).toBe(false);
    expect(result.isConsensusReached).toBe(true);
    expect(result.proposalScores['prop-1'].totalPoints).toBe(9);
  });

  it('detects ties and flags lack of consensus', () => {
    const votes: UserVote[] = [
      { userId: 'u1', proposalId: 'prop-1', weight: 5 },
      { userId: 'u2', proposalId: 'prop-2', weight: 5 }
    ];

    const result = calculateGroupVotingConsensus(proposals, votes, 2);
    expect(result.hasTie).toBe(true);
    expect(result.winningProposalId).toBeNull();
    expect(result.isConsensusReached).toBe(false);
  });

  it('computes budget variance and identifies overbudget proposals', () => {
    const participantBudgets = { u1: 500, u2: 600, u3: 400 };

    const res1 = computeGroupBudgetVariance(proposals[0], participantBudgets); // 450 per person
    expect(res1.overbudgetCount).toBe(1); // u3 budget 400 < 450
    expect(res1.isAffordableForGroup).toBe(false);

    const res2 = computeGroupBudgetVariance(proposals[1], participantBudgets); // 850 per person
    expect(res2.overbudgetCount).toBe(3);
    expect(res2.averageVariance).toBeGreaterThan(0);
  });
});
