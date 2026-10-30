import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SponsoredBadge } from '../ui/StatusBadges';
import { RiskBadge, RiskLevel as BadgeRiskLevel } from '../ui/RiskBadge';
import { fetchRankedSponsoredStays } from '../../features/rewards/rewardsService';
import { generateWhyThisStay, StayCandidate } from '../../features/rewards/ranking';
import { Building2, Navigation, Gift, Loader2 } from 'lucide-react';

export interface SponsoredStaysSectionProps {
  userCoordinates?: [number, number]; // [lng, lat]
  className?: string;
}

export const SponsoredStaysSection: React.FC<SponsoredStaysSectionProps> = ({
  userCoordinates,
  className = '',
}) => {
  const navigate = useNavigate();
  const [stays, setStays] = useState<StayCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userLng = userCoordinates?.[0];
  const userLat = userCoordinates?.[1];

  useEffect(() => {
    let isMounted = true;
    async function loadStays() {
      setIsLoading(true);
      try {
        const coords: [number, number] | undefined =
          userLng !== undefined && userLat !== undefined ? [userLng, userLat] : undefined;
        const ranked = await fetchRankedSponsoredStays(coords);
        if (isMounted) {
          setStays(ranked.slice(0, 4)); // Top 4 safe options for Home page
        }
      } catch {
        // Fallback handled in service
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadStays();
    return () => {
      isMounted = false;
    };
  }, [userLng, userLat]);

  return (
    <div className={`bg-white border border-border rounded-card p-5 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-h3 font-bold text-brand flex items-center gap-2">
              <Building2 size={18} className="text-brand" />
              Verified Safe Shelters & Stays
            </h3>
            <SponsoredBadge />
          </div>
          <p className="text-xs text-text-2 mt-0.5">
            Partner shelters located on stable bedrock outside active landslide runout zones.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/stays')}
          icon={<Navigation size={13} />}
        >
          Explore All Stays
        </Button>
      </div>

      {/* Grid of Safe Stays */}
      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center text-text-3">
          <Loader2 size={20} className="animate-spin text-accent mb-2" />
          <span className="text-xs font-mono">Evaluating regional safety & slopes...</span>
        </div>
      ) : stays.length === 0 ? (
        <div className="py-6 text-center text-text-3 text-xs">
          No partner stays currently available in this sector.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {stays.map((stay) => {
            const whyLine = generateWhyThisStay(stay);

            return (
              <Card
                key={stay.id}
                className="p-3.5 border-border bg-surface hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Status Badges */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <RiskBadge level={stay.riskLevel.toLowerCase() as BadgeRiskLevel} score={stay.riskScore} size="sm" />
                    {stay.city && (
                      <span className="text-[10px] text-text-3 font-mono">{stay.city}</span>
                    )}
                  </div>

                  {/* Stay Name */}
                  <h4 className="font-semibold text-text text-xs leading-snug line-clamp-1 mt-1">
                    {stay.name}
                  </h4>

                  {/* "Why this stay" line from REAL FIELDS ONLY */}
                  <div className="text-[11px] text-text-2 mt-1 leading-relaxed">
                    <span className="text-brand font-medium">Why this stay:</span>{' '}
                    <span>{whyLine}</span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-mono text-accent font-semibold flex items-center gap-1">
                    <Gift size={11} />
                    Coupon Eligible
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/rewards')}
                    className="text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                  >
                    View Offer →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
