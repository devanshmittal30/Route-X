import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import {
  fetchUserProfileRewards,
  fetchPointsLedger,
  fetchAvailableOffers,
  fetchUserRedemptions,
} from '../features/rewards/rewardsService';
import {
  Offer,
  PointsLedgerEntry,
  UserProfileRewards,
  Redemption,
} from '../features/rewards/types';
import { RedeemModal } from '../components/rewards/RedeemModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DemoBadge } from '../components/ui/StatusBadges';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Award,
  Gift,
  Shield,
  TrendingUp,
  History,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  HelpCircle,
  Loader2,
  LogIn,
  MapPin,
  Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileRewards | null>(null);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'offers' | 'ledger' | 'my-coupons'>('offers');
  const [selectedOfferForRedeem, setSelectedOfferForRedeem] = useState<Offer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch available partner offers (public)
      const offersData = await fetchAvailableOffers(true);
      setOffers(offersData);

      // 2. If user is logged in, fetch user rewards profile, ledger, and redemptions
      if (user?.id) {
        const [profData, ledgerData, redemptionsData] = await Promise.all([
          fetchUserProfileRewards(user.id),
          fetchPointsLedger(user.id),
          fetchUserRedemptions(user.id),
        ]);
        setProfile(profData);
        setLedger(ledgerData);
        setRedemptions(redemptionsData);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      // Ignore
    }
  };

  const handleRedeemSuccess = (_code: string, pointsSpent: number) => {
    // Optimistically update points
    if (profile) {
      setProfile({
        ...profile,
        points: Math.max(0, profile.points - pointsSpent),
      });
    }
    // Refresh ledger and redemptions
    if (user?.id) {
      fetchPointsLedger(user.id).then(setLedger);
      fetchUserRedemptions(user.id).then(setRedemptions);
    }
  };

  const points = profile?.points ?? 0;
  const trustScore = profile?.trust_score ?? 50;

  const getTrustLevel = (score: number) => {
    if (score >= 80) return { label: 'Route Guardian', level: 'Level 3', color: 'text-verified' };
    if (score >= 60) return { label: 'Pathfinder', level: 'Level 2', color: 'text-accent' };
    return { label: 'Mountain Explorer', level: 'Level 1', color: 'text-text-2' };
  };

  const trustLevel = getTrustLevel(trustScore);

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 font-bold text-brand">Rewards & Trust</h1>
            <DemoBadge label="DEMO OFFERS" />
          </div>
          <p className="text-body text-text-2 mt-1">
            Earn community karma by reporting mountain hazards and verifying road conditions.
          </p>
        </div>

        {!user && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            icon={<LogIn size={14} />}
          >
            Sign In to Earn Points
          </Button>
        )}
      </div>

      {/* Top Profile Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Points Balance Card */}
        <Card className="p-5 bg-white border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-3 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider">Points Balance</span>
              <Award size={18} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-brand">
                {user ? points : '--'}
              </span>
              <span className="text-sm font-semibold text-text-2">PTS</span>
            </div>
          </div>
          <p className="text-[11px] text-text-3 font-mono mt-3">
            {user ? 'Available to redeem on demo offers' : 'Sign in to access your point balance'}
          </p>
        </Card>

        {/* Trust Score Card */}
        <Card className="p-5 bg-white border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-text-3 text-xs font-semibold mb-2">
              <span className="uppercase tracking-wider">Community Trust Score</span>
              <Shield size={18} className="text-verified" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-text">
                {user ? trustScore : '--'}
              </span>
              <span className="text-sm font-mono text-text-3">/ 100</span>
            </div>
          </div>
          <div>
            {/* Progress Bar */}
            <div className="w-full bg-surface-2 rounded-full h-2 mt-2 overflow-hidden border border-border">
              <div
                className="bg-accent h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium mt-1.5">
              <span className={trustLevel.color}>{trustLevel.label}</span>
              <span className="text-text-3 font-mono">{trustLevel.level}</span>
            </div>
          </div>
        </Card>

        {/* Contributor Standing */}
        <Card className="p-5 bg-brand-soft border border-brand/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-brand text-xs font-semibold mb-1">
              <span className="uppercase tracking-wider">Safety Status</span>
              <TrendingUp size={18} />
            </div>
            <h3 className="text-h3 font-bold text-brand mt-1">Verified Mountain Partner</h3>
            <p className="text-xs text-text-2 mt-1">
              Your votes directly assist other travelers navigating dangerous terrain.
            </p>
          </div>
          <div className="text-[11px] font-mono text-brand/80 mt-2">
            100% Non-commercial demonstration
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-btn text-xs font-semibold transition-colors ${
            activeTab === 'offers'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-surface hover:bg-surface-2 text-text-2'
          }`}
        >
          <Gift size={14} />
          <span>Demo Offers ({offers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-btn text-xs font-semibold transition-colors ${
            activeTab === 'ledger'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-surface hover:bg-surface-2 text-text-2'
          }`}
        >
          <History size={14} />
          <span>Points Ledger ({ledger.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-coupons')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-btn text-xs font-semibold transition-colors ${
            activeTab === 'my-coupons'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-surface hover:bg-surface-2 text-text-2'
          }`}
        >
          <Tag size={14} />
          <span>My Coupons ({redemptions.length})</span>
        </button>
      </div>

      {/* TAB 1: DEMO OFFERS GRID */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text">Available Partner Offers</h2>
            <span className="text-xs text-text-3 font-mono">Redeem with earned points</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-text-3">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-accent" />
              <p className="text-xs">Loading partner offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No Offers Available"
              description="Check back soon for new demo mountain lodging and gear rental discounts."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => {
                const canAfford = points >= offer.points_cost;
                const isRedeemedToday = redemptions.some(
                  (r) =>
                    r.offer_id === offer.id &&
                    new Date(r.created_at).toDateString() === new Date().toDateString()
                );

                return (
                  <Card
                    key={offer.id}
                    className="p-5 border border-border bg-white flex flex-col justify-between hover:shadow-xs transition-shadow relative overflow-hidden"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <DemoBadge />
                        <span className="text-[11px] font-mono text-text-3 flex items-center gap-1">
                          <MapPin size={11} />
                          {offer.partner?.city || 'Himalayan Corridor'}
                        </span>
                      </div>

                      {/* Title & Partner */}
                      <h3 className="font-bold text-text text-sm sm:text-base leading-snug">
                        {offer.title}
                      </h3>
                      <div className="text-xs font-medium text-brand mt-1">
                        {offer.partner?.name || 'Verified Mountain Homestay'}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-text-2 mt-2 leading-relaxed">
                        {offer.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-text-3 uppercase tracking-wider font-semibold">
                          Cost
                        </div>
                        <div className="font-mono font-extrabold text-base text-brand">
                          {offer.points_cost} PTS
                        </div>
                      </div>

                      <Button
                        variant={canAfford && !isRedeemedToday ? 'primary' : 'secondary'}
                        size="sm"
                        disabled={!user || !canAfford || isRedeemedToday}
                        onClick={() => setSelectedOfferForRedeem(offer)}
                        title={
                          !user
                            ? 'Sign in to redeem'
                            : isRedeemedToday
                              ? 'Limit 1 redemption per offer per day'
                              : !canAfford
                                ? `Requires ${offer.points_cost} points (you have ${points})`
                                : 'Redeem offer'
                        }
                      >
                        {isRedeemedToday
                          ? 'Redeemed Today'
                          : !canAfford
                            ? 'Need More Pts'
                            : 'Redeem'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POINTS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text">Points & Activity Ledger</h2>
            <span className="text-xs text-text-3 font-mono">Realtime immutable transaction record</span>
          </div>

          {!user ? (
            <EmptyState
              icon={History}
              title="Sign In Required"
              description="Please log in to view your complete points history and community rewards."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              }
            />
          ) : ledger.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Points History Yet"
              description="You have not earned or spent any points yet. Post a hazard report or vote on road reports to start earning!"
            />
          ) : (
            <div className="overflow-x-auto border border-border rounded-card bg-white shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-text-3 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Activity Description</th>
                    <th className="py-3 px-4 text-right">Points Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-3 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-text font-medium">
                        {entry.reason}
                        {entry.ref_id && (
                          <span className="ml-2 text-[10px] text-text-3 font-mono">
                            ref: {entry.ref_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono font-bold text-right whitespace-nowrap ${
                          entry.delta > 0
                            ? 'text-verified'
                            : entry.delta < 0
                              ? 'text-risk-severe'
                              : 'text-text-2'
                        }`}
                      >
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY REDEEMED COUPONS */}
      {activeTab === 'my-coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text">My Active Coupons</h2>
            <span className="text-xs text-text-3 font-mono">Present code at partner check-in</span>
          </div>

          {!user ? (
            <EmptyState
              icon={Tag}
              title="Sign In Required"
              description="Please log in to view your redeemed coupons."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              }
            />
          ) : redemptions.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No Redeemed Coupons"
              description="You have not redeemed any partner coupons yet. Browse available offers above to spend your earned points."
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('offers')}>
                  Browse Offers
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="relative overflow-hidden rounded-card border-2 border-dashed border-brand/30 bg-white p-5 shadow-xs space-y-3"
                >
                  {/* Rotated DEMO Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10 rotate-[-15deg] font-black text-2xl sm:text-3xl text-brand uppercase tracking-widest">
                    DEMO COUPON
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <DemoBadge label="DEMO PARTNER" />
                      <span className="text-[10px] text-text-3 font-mono">
                        Issued {new Date(redemption.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <h4 className="font-bold text-text text-sm">
                      {redemption.offer?.title || 'Mountain Partner Offer'}
                    </h4>

                    {/* JetBrains Mono Code Box */}
                    <div className="py-2 px-3 bg-surface border border-brand/20 rounded-btn flex items-center justify-between">
                      <span className="font-mono font-bold text-lg tracking-widest text-brand select-all">
                        {redemption.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(redemption.code)}
                        className="p-1 rounded-btn hover:bg-surface-2 text-text-2 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === redemption.code ? (
                          <Check size={16} className="text-verified" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-text-3 font-mono">
                      <Calendar size={12} />
                      <span>Valid at participating demo locations</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* "How to Earn Points & Trust" Section (Doc 02 6.10 & Doc 03 Section 8) */}
      <Card className="p-6 bg-surface border border-border rounded-card">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={18} className="text-brand" />
          <h3 className="text-h3 font-bold text-brand">How Community Karma Works</h3>
        </div>
        <p className="text-xs text-text-2 mb-4 leading-relaxed">
          RouteX relies on peer-verified crowdsourcing to keep Himalayan and Northeast travelers safe.
          All points and trust transitions are governed by automated rules:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-white rounded-btn border border-border space-y-1">
            <div className="font-bold text-text flex items-center justify-between">
              <span>Report Hazard</span>
              <span className="font-mono text-verified font-bold">+5 PTS</span>
            </div>
            <p className="text-text-3 text-[11px] leading-snug">
              Submit a verified road obstruction or rockfall (up to 5 rewarded reports/day).
            </p>
          </div>

          <div className="p-3 bg-white rounded-btn border border-border space-y-1">
            <div className="font-bold text-text flex items-center justify-between">
              <span>Community Verified</span>
              <span className="font-mono text-verified font-bold">+20 PTS</span>
            </div>
            <p className="text-text-3 text-[11px] leading-snug">
              When 3 independent travelers confirm your hazard, earn +20 points and +3 trust score.
            </p>
          </div>

          <div className="p-3 bg-white rounded-btn border border-border space-y-1">
            <div className="font-bold text-text flex items-center justify-between">
              <span>Vote & Confirm</span>
              <span className="font-mono text-verified font-bold">+1 PT</span>
            </div>
            <p className="text-text-3 text-[11px] leading-snug">
              Confirm or dispute other road hazards (up to 10 points daily from voting).
            </p>
          </div>

          <div className="p-3 bg-white rounded-btn border border-border space-y-1">
            <div className="font-bold text-text flex items-center justify-between">
              <span>Disputed Penalty</span>
              <span className="font-mono text-risk-severe font-bold">-15 PTS</span>
            </div>
            <p className="text-text-3 text-[11px] leading-snug">
              False or fabricated reports disputed by the community deduct 15 points and 10 trust.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-text-3 font-mono">
          <AlertCircle size={13} className="text-risk-moderate shrink-0" />
          <span>Test reports and demo data never award points or alter community statistics.</span>
        </div>
      </Card>

      {/* Redeem Confirmation Modal */}
      <RedeemModal
        isOpen={Boolean(selectedOfferForRedeem)}
        onClose={() => setSelectedOfferForRedeem(null)}
        offer={selectedOfferForRedeem}
        userPoints={points}
        onRedeemSuccess={handleRedeemSuccess}
      />
    </div>
  );
};
