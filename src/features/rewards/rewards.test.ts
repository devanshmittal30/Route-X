import { describe, it, expect } from 'vitest';
import {
  evaluateReportStatus,
  calculateReporterOutcomeReward,
  calculateVoterReward,
  canVoteOnReport,
  canRedeemOffer,
} from './rules';
import { rankStays, generateWhyThisStay, StayCandidate } from './ranking';

describe('Voting and Status Transitions (Doc 03 Section 8)', () => {
  it('transitions pending to verified when net upvotes >= 3 and up_count >= 3', () => {
    // 3 up, 0 down -> verified
    const res1 = evaluateReportStatus(3, 0, 'pending');
    expect(res1.status).toBe('verified');
    expect(res1.changed).toBe(true);

    // 4 up, 1 down -> net 3, up >= 3 -> verified
    const res2 = evaluateReportStatus(4, 1, 'pending');
    expect(res2.status).toBe('verified');

    // 2 up, 0 down -> net 2 (< 3) -> pending
    const res3 = evaluateReportStatus(2, 0, 'pending');
    expect(res3.status).toBe('pending');
    expect(res3.changed).toBe(false);

    // 5 up, 3 down -> net 2 -> pending
    const res4 = evaluateReportStatus(5, 3, 'pending');
    expect(res4.status).toBe('pending');
  });

  it('transitions pending to disputed when net downvotes >= 3', () => {
    // 0 up, 3 down -> disputed
    const res1 = evaluateReportStatus(0, 3, 'pending');
    expect(res1.status).toBe('disputed');
    expect(res1.changed).toBe(true);

    // 1 up, 4 down -> net down 3 -> disputed
    const res2 = evaluateReportStatus(1, 4, 'pending');
    expect(res2.status).toBe('disputed');

    // 1 up, 3 down -> net down 2 -> pending
    const res3 = evaluateReportStatus(1, 3, 'pending');
    expect(res3.status).toBe('pending');
  });

  it('reverts verified or disputed report back to pending if vote thresholds are lost', () => {
    // Previously verified, but new downvotes bring net below 3
    const res = evaluateReportStatus(3, 1, 'verified'); // net 2
    expect(res.status).toBe('pending');
    expect(res.changed).toBe(true);
  });

  it('preserves terminal statuses (resolved, expired)', () => {
    const resResolved = evaluateReportStatus(5, 0, 'resolved');
    expect(resResolved.status).toBe('resolved');
    expect(resResolved.changed).toBe(false);

    const resExpired = evaluateReportStatus(5, 0, 'expired');
    expect(resExpired.status).toBe('expired');
  });
});

describe('Points & Trust Score Rules (Doc 03 Section 8)', () => {
  it('awards +20 points and +3 trust to reporter when report becomes verified', () => {
    const res = calculateReporterOutcomeReward('pending', 'verified', 50, 50, false);
    expect(res.pointsDelta).toBe(20);
    expect(res.newPoints).toBe(70);
    expect(res.trustDelta).toBe(3);
    expect(res.newTrust).toBe(53);
    expect(res.awarded).toBe(true);
  });

  it('awards +10 points to author when all_clear report becomes verified', () => {
    const res = calculateReporterOutcomeReward('pending', 'verified', 50, 50, false, 'all_clear');
    expect(res.pointsDelta).toBe(10);
    expect(res.newPoints).toBe(60);
    expect(res.trustDelta).toBe(3);
  });

  it('deducts -15 points (floor 0) and -10 trust when report becomes disputed', () => {
    const res = calculateReporterOutcomeReward('pending', 'disputed', 50, 50, false);
    expect(res.pointsDelta).toBe(-15);
    expect(res.newPoints).toBe(35);
    expect(res.trustDelta).toBe(-10);
    expect(res.newTrust).toBe(40);

    // Floor 0 test: User with only 10 points loses 15 -> points remain 0 (never negative)
    const resFloor = calculateReporterOutcomeReward('pending', 'disputed', 10, 5, false);
    expect(resFloor.pointsDelta).toBe(-15);
    expect(resFloor.newPoints).toBe(0); // Floor 0
    expect(resFloor.newTrust).toBe(0); // Clamped to 0
  });

  it('caps trust score at 100 max', () => {
    const res = calculateReporterOutcomeReward('pending', 'verified', 100, 99, false);
    expect(res.trustDelta).toBe(3);
    expect(res.newTrust).toBe(100); // 99 + 3 capped at 100
  });

  it('never awards points or changes trust for test reports (is_test = true)', () => {
    const res = calculateReporterOutcomeReward('pending', 'verified', 50, 50, true);
    expect(res.pointsDelta).toBe(0);
    expect(res.newPoints).toBe(50);
    expect(res.trustDelta).toBe(0);
    expect(res.newTrust).toBe(50);
    expect(res.awarded).toBe(false);
  });

  it('awards +1 point per vote on someone elses report up to 10 points/day', () => {
    // 1st vote today -> +1 point
    const res1 = calculateVoterReward(50, 0, false, false);
    expect(res1.pointsDelta).toBe(1);
    expect(res1.newPoints).toBe(51);
    expect(res1.awarded).toBe(true);

    // 10th vote today (votesTodayCount = 9) -> +1 point
    const res10 = calculateVoterReward(59, 9, false, false);
    expect(res10.pointsDelta).toBe(1);
    expect(res10.newPoints).toBe(60);

    // 11th vote today (votesTodayCount = 10) -> cap reached, 0 points
    const res11 = calculateVoterReward(60, 10, false, false);
    expect(res11.pointsDelta).toBe(0);
    expect(res11.newPoints).toBe(60);
    expect(res11.awarded).toBe(false);
  });

  it('blocks voting reward on own report or test reports', () => {
    // Own report
    const resOwn = calculateVoterReward(50, 0, true, false);
    expect(resOwn.pointsDelta).toBe(0);
    expect(resOwn.awarded).toBe(false);

    // Test report
    const resTest = calculateVoterReward(50, 0, false, true);
    expect(resTest.pointsDelta).toBe(0);
    expect(resTest.awarded).toBe(false);
  });
});

describe('Eligibility Checks (Doc 01 & 03)', () => {
  it('blocks voting when logged out or on own report', () => {
    expect(canVoteOnReport(null, 'user-1').canVote).toBe(false);
    expect(canVoteOnReport('user-1', 'user-1').canVote).toBe(false);
    expect(canVoteOnReport('user-2', 'user-1').canVote).toBe(true);
  });

  it('validates offer redemption eligibility', () => {
    // Insufficient points
    const resInsufficient = canRedeemOffer(30, 50, false);
    expect(resInsufficient.canRedeem).toBe(false);
    expect(resInsufficient.reason).toContain('Insufficient points');

    // Already redeemed today
    const resAlreadyRedeemed = canRedeemOffer(100, 50, true);
    expect(resAlreadyRedeemed.canRedeem).toBe(false);
    expect(resAlreadyRedeemed.reason).toContain('already redeemed today');

    // Eligible
    const resEligible = canRedeemOffer(100, 50, false);
    expect(resEligible.canRedeem).toBe(true);
  });
});

describe('Stay Ranking Rule (Doc 03 Section 9)', () => {
  const stays: StayCandidate[] = [
    {
      id: '1',
      name: 'Severe Hazard Cabin',
      category: 'stay',
      coordinates: [77.17, 31.1],
      riskLevel: 'Severe',
      riskScore: 85,
      isSponsored: true,
      distanceKm: 1.0,
    },
    {
      id: '2',
      name: 'Moderate Slope Lodge (Sponsored)',
      category: 'stay',
      coordinates: [77.18, 31.11],
      riskLevel: 'Moderate',
      riskScore: 35,
      isSponsored: true,
      distanceKm: 2.0,
    },
    {
      id: '3',
      name: 'Low Risk Homestay B (Far)',
      category: 'stay',
      coordinates: [77.19, 31.12],
      riskLevel: 'Low',
      riskScore: 12,
      isSponsored: false,
      distanceKm: 10.0,
    },
    {
      id: '4',
      name: 'Low Risk Homestay A (Sponsored, Closer)',
      category: 'stay',
      coordinates: [77.16, 31.1],
      riskLevel: 'Low',
      riskScore: 10,
      isSponsored: true,
      distanceKm: 3.0,
    },
    {
      id: '5',
      name: 'Low Risk Homestay C (Non-sponsored, Closer)',
      category: 'stay',
      coordinates: [77.15, 31.1],
      riskLevel: 'Low',
      riskScore: 14,
      isSponsored: false,
      distanceKm: 2.0,
    },
  ];

  it('hides Severe stays and ranks by safety level first, sponsored first within level, then distance', () => {
    const ranked = rankStays(stays);

    // Severe stay (id 1) must be filtered out
    expect(ranked.some((s) => s.riskLevel === 'Severe')).toBe(false);

    // All Low stays must appear before Moderate stays
    const firstModerateIndex = ranked.findIndex((s) => s.riskLevel === 'Moderate');
    const lowStays = ranked.slice(0, firstModerateIndex);
    expect(lowStays.every((s) => s.riskLevel === 'Low')).toBe(true);

    // Within Low risk stays: sponsored stay (id 4) appears before non-sponsored stays (id 5, id 3)
    expect(ranked[0].id).toBe('4'); // Sponsored Low stay
    expect(ranked[1].id).toBe('5'); // Non-sponsored closer Low stay (2.0 km)
    expect(ranked[2].id).toBe('3'); // Non-sponsored further Low stay (10.0 km)
    expect(ranked[3].id).toBe('2'); // Moderate stay
  });

  it('generates an explainable "Why this stay" line using real fields only', () => {
    const line = generateWhyThisStay({
      id: 'stay-1',
      name: 'Shimla Pine Homestay',
      category: 'stay',
      coordinates: [77.17, 31.1],
      riskLevel: 'Low',
      riskScore: 18,
      isSponsored: true,
      distanceKm: 4.2,
      amenityTags: ['Stable bedrock', 'Emergency kit'],
    });

    expect(line).toBe('Low Risk (score 18) · 4.2 km away · Stable bedrock, Emergency kit');
  });
});
