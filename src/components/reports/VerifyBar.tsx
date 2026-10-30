import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { castVote } from '../../features/reports/reportsService';
import { useAuth } from '../../features/auth/AuthContext';
import { VerifiedBadge, DisputedBadge } from '../ui/StatusBadges';

export interface VerifyBarProps {
  reportId: string;
  reportUserId: string | null;
  upCount: number;
  downCount: number;
  status: 'pending' | 'verified' | 'disputed' | 'resolved' | 'expired';
  initialUserVote?: 1 | -1 | null;
  onVoteSuccess?: (newStatus?: string, up?: number, down?: number) => void;
  className?: string;
}

export const VerifyBar: React.FC<VerifyBarProps> = ({
  reportId,
  reportUserId,
  upCount: initialUp,
  downCount: initialDown,
  status: initialStatus,
  initialUserVote = null,
  onVoteSuccess,
  className = '',
}) => {
  const { user } = useAuth();
  const [upCount, setUpCount] = useState<number>(initialUp);
  const [downCount, setDownCount] = useState<number>(initialDown);
  const [status, setStatus] = useState(initialStatus);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwnReport = Boolean(user && reportUserId && user.id === reportUserId);
  const isLoggedOut = !user;
  const isVerified = status === 'verified' || (upCount - downCount >= 3 && upCount >= 3);
  const isDisputed = status === 'disputed' || (downCount - upCount >= 3);

  const handleVote = async (vote: 1 | -1) => {
    if (isLoggedOut || isOwnReport || isVoting) return;

    setErrorMsg(null);
    setIsVoting(true);

    // Optimistic counts and vote state
    const prevUp = upCount;
    const prevDown = downCount;
    const prevVote = userVote;
    const prevStatus = status;

    if (vote === 1) {
      setUpCount((prev) => (userVote === 1 ? prev : prev + 1));
      if (userVote === -1) setDownCount((prev) => Math.max(0, prev - 1));
    } else {
      setDownCount((prev) => (userVote === -1 ? prev : prev + 1));
      if (userVote === 1) setUpCount((prev) => Math.max(0, prev - 1));
    }
    setUserVote(vote);

    try {
      const res = await castVote(reportId, vote);
      if (res.newStatus) setStatus(res.newStatus as typeof status);
      if (res.upCount !== undefined) setUpCount(res.upCount);
      if (res.downCount !== undefined) setDownCount(res.downCount);

      onVoteSuccess?.(res.newStatus, res.upCount, res.downCount);
    } catch (err: unknown) {
      // Revert optimistic update on error
      setUpCount(prevUp);
      setDownCount(prevDown);
      setUserVote(prevVote);
      setStatus(prevStatus);
      setErrorMsg((err as Error).message || 'Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  const getVoteTooltip = (voteType: 1 | -1): string => {
    if (isLoggedOut) return 'Sign in to vote & verify reports';
    if (isOwnReport) return 'You cannot vote on your own report';
    return voteType === 1
      ? 'Confirm hazard is still present (+1 karma pt)'
      : 'Report hazard is cleared or incorrect';
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Verification Status Badge & Count */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {isVerified ? (
            <div className="flex items-center gap-1.5">
              <VerifiedBadge />
              <span className="text-verified text-xs font-semibold">
                Verified by {upCount} {upCount === 1 ? 'person' : 'people'}
              </span>
            </div>
          ) : isDisputed ? (
            <DisputedBadge count={downCount} />
          ) : (
            <span className="text-text-3 font-mono text-[11px]">
              {upCount >= 1 ? `${upCount} confirmed · Pending verification` : 'Awaiting confirmation'}
            </span>
          )}
        </div>

        {/* Action Buttons: Thumbs Up / Thumbs Down */}
        <div className="flex items-center gap-1.5">
          {/* Thumbs Up (Still there / True) */}
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={isLoggedOut || isOwnReport || isVoting}
            title={getVoteTooltip(1)}
            aria-label="Confirm hazard is present (thumbs up)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-btn text-xs font-semibold transition-all select-none ${
              userVote === 1
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface hover:bg-surface-2 text-text border border-border'
            } ${
              isLoggedOut || isOwnReport
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer active:scale-95'
            }`}
          >
            {isVoting && userVote === 1 ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ThumbsUp size={12} className={userVote === 1 ? 'fill-white' : ''} />
            )}
            <span className="font-mono">{upCount}</span>
          </button>

          {/* Thumbs Down (Not true / Cleared) */}
          <button
            type="button"
            onClick={() => handleVote(-1)}
            disabled={isLoggedOut || isOwnReport || isVoting}
            title={getVoteTooltip(-1)}
            aria-label="Report hazard cleared or false (thumbs down)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-btn text-xs font-semibold transition-all select-none ${
              userVote === -1
                ? 'bg-risk-severe text-white shadow-xs'
                : 'bg-surface hover:bg-surface-2 text-text border border-border'
            } ${
              isLoggedOut || isOwnReport
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer active:scale-95'
            }`}
          >
            {isVoting && userVote === -1 ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ThumbsDown size={12} className={userVote === -1 ? 'fill-white' : ''} />
            )}
            <span className="font-mono">{downCount}</span>
          </button>
        </div>
      </div>

      {/* Helper text / Tooltip fallback */}
      {isOwnReport && (
        <span className="text-[10px] text-text-3 font-mono">You posted this report</span>
      )}
      {isLoggedOut && (
        <span className="text-[10px] text-text-3 font-mono">Sign in to vote & verify (+1 pt)</span>
      )}
      {errorMsg && (
        <span className="text-[10px] text-risk-severe font-medium">{errorMsg}</span>
      )}
    </div>
  );
};
