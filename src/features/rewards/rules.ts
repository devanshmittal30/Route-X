/**
 * Pure functions implementing points, trust score, and status transitions
 * defined in Docs 01 & 03 Section 8.
 *
 * Rules:
 * 1. Status:
 *    - pending -> verified when up - down >= 3 and up >= 3
 *    - -> disputed when down - up >= 3
 *    - if previously verified or disputed but votes changed -> pending
 * 2. Points & Trust:
 *    - Report verified: reporter +20 pts, +3 trust
 *    - Report disputed: reporter -15 pts (floor 0), -10 trust (floor 0)
 *    - Vote on someone else's report: +1 pt (max 10 pts/day from voting)
 *    - Verified all_clear report: +10 pts to author
 *    - Submit report: +5 pts (max 5 rewarded reports/day)
 *    - Voter matching final outcome: +1 trust (cap 100)
 *    - Test data (is_test = true): NEVER awards points or changes trust.
 *    - Points balance never below 0 (floor 0). Trust score between 0 and 100.
 */

export type ReportStatus = 'pending' | 'verified' | 'disputed' | 'resolved' | 'expired';

export interface StatusEvaluationResult {
  status: ReportStatus;
  changed: boolean;
  reason: string;
}

/**
 * Pure function to evaluate hazard report status based on up/down votes.
 */
export function evaluateReportStatus(
  upCount: number,
  downCount: number,
  currentStatus: ReportStatus
): StatusEvaluationResult {
  // If already resolved or expired, status does not change via standard votes
  if (currentStatus === 'resolved' || currentStatus === 'expired') {
    return { status: currentStatus, changed: false, reason: 'Terminal status' };
  }

  const netUp = upCount - downCount;
  const netDown = downCount - upCount;

  let newStatus: ReportStatus = currentStatus;
  let reason = 'No status change';

  if (netUp >= 3 && upCount >= 3) {
    newStatus = 'verified';
    reason = 'Net +3 upvotes reached with at least 3 confirmations';
  } else if (netDown >= 3) {
    newStatus = 'disputed';
    reason = 'Net +3 downvotes reached';
  } else if (currentStatus === 'verified' || currentStatus === 'disputed') {
    newStatus = 'pending';
    reason = 'Vote threshold no longer satisfied; reverted to pending';
  }

  return {
    status: newStatus,
    changed: newStatus !== currentStatus,
    reason,
  };
}

export interface PointsTrustDelta {
  pointsDelta: number;
  newPoints: number;
  trustDelta: number;
  newTrust: number;
  awarded: boolean;
  reason: string;
}

/**
 * Pure function to calculate reporter points and trust changes when report status changes.
 */
export function calculateReporterOutcomeReward(
  oldStatus: ReportStatus,
  newStatus: ReportStatus,
  currentPoints: number,
  currentTrust: number,
  isTest = false,
  reportType?: string
): PointsTrustDelta {
  // Test reports never award points or alter trust
  if (isTest) {
    return {
      pointsDelta: 0,
      newPoints: currentPoints,
      trustDelta: 0,
      newTrust: currentTrust,
      awarded: false,
      reason: 'Test data never awards points or changes trust',
    };
  }

  let pointsDelta = 0;
  let trustDelta = 0;
  let reason = 'No change';
  let awarded = false;

  if (oldStatus !== 'verified' && newStatus === 'verified') {
    const isAllClear = reportType === 'all_clear';
    pointsDelta = isAllClear ? 10 : 20;
    trustDelta = 3;
    reason = isAllClear ? 'All-clear report verified by community' : 'Report verified by community';
    awarded = true;
  } else if (oldStatus !== 'disputed' && newStatus === 'disputed') {
    pointsDelta = -15;
    trustDelta = -10;
    reason = 'Report disputed by community';
    awarded = true;
  }

  // Apply floor 0 to points and clamp trust score [0, 100]
  const newPoints = Math.max(0, currentPoints + pointsDelta);
  const newTrust = Math.min(100, Math.max(0, currentTrust + trustDelta));

  return {
    pointsDelta,
    newPoints,
    trustDelta,
    newTrust,
    awarded,
    reason,
  };
}

/**
 * Pure function to calculate voter points when casting a vote.
 */
export function calculateVoterReward(
  currentPoints: number,
  votesTodayCount: number,
  isOwnReport: boolean,
  isTest = false
): { pointsDelta: number; newPoints: number; awarded: boolean; reason: string } {
  if (isTest) {
    return {
      pointsDelta: 0,
      newPoints: currentPoints,
      awarded: false,
      reason: 'Test data never awards points',
    };
  }

  if (isOwnReport) {
    return {
      pointsDelta: 0,
      newPoints: currentPoints,
      awarded: false,
      reason: 'Cannot vote on own report',
    };
  }

  if (votesTodayCount >= 10) {
    return {
      pointsDelta: 0,
      newPoints: currentPoints,
      awarded: false,
      reason: 'Daily voting reward cap reached (max 10 points/day)',
    };
  }

  return {
    pointsDelta: 1,
    newPoints: currentPoints + 1,
    awarded: true,
    reason: 'Voted on community report',
  };
}

/**
 * Pure function to check if a user is eligible to vote on a report.
 */
export function canVoteOnReport(
  userId: string | null | undefined,
  reportAuthorId: string | null | undefined
): { canVote: boolean; reason?: string } {
  if (!userId) {
    return { canVote: false, reason: 'Sign in to vote on community reports' };
  }
  if (reportAuthorId && userId === reportAuthorId) {
    return { canVote: false, reason: 'You cannot vote on your own report' };
  }
  return { canVote: true };
}

/**
 * Pure function to check offer redemption eligibility.
 */
export function canRedeemOffer(
  userPoints: number,
  pointsCost: number,
  alreadyRedeemedToday: boolean
): { canRedeem: boolean; reason?: string } {
  if (userPoints < pointsCost) {
    return {
      canRedeem: false,
      reason: `Insufficient points (requires ${pointsCost} pts, you have ${userPoints} pts)`,
    };
  }
  if (alreadyRedeemedToday) {
    return {
      canRedeem: false,
      reason: 'Offer already redeemed today. Limit: 1 redemption per offer per day.',
    };
  }
  return { canRedeem: true };
}
