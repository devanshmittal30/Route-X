import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, BadgeCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { castVote } from '../../features/reports/reportsService';
import { useAuth } from '../../features/auth/AuthContext';

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

  const handleVote = async (vote: 1 | -1) => {
    if (isLoggedOut || isOwnReport || isVoting) return;

    setErrorMsg(null);
    setIsVoting(true);

    // Optimistic counts
    const prevUp = upCount;
    const prevDown = downCount;
    const prevVote = userVote;

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
      // Revert optimistic update
      setUpCount(prevUp);
      setDownCount(prevDown);
      setUserVote(prevVote);
      setErrorMsg((err as Error).message || 'Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Verification Status Badge */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-accent font-semibold">
              <BadgeCheck size={14} className="text-accent" />
              Verified by {upCount} {upCount === 1 ? 'person' : 'people'}
            </span>
          ) : status === 'disputed' ? (
            <span className="inline-flex items-center gap-1 text-risk-moderate">
              <ShieldAlert size={14} />
              Disputed ({downCount} doubts)
            </span>
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
            title={
              isLoggedOut
                ? 'Sign in to confirm reports'
                : isOwnReport
                  ? 'Cannot vote on your own report'
                  : 'Confirm hazard is still there (+1 pt)'
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-btn text-xs font-semibold transition-all ${
              userVote === 1
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface hover:bg-surface-2 text-text border border-border'
            } ${
              isLoggedOut || isOwnReport ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
            }`}
          >
            {isVoting && userVote === 1 ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ThumbsUp size={12} className={userVote === 1 ? 'fill-white' : ''} />
            )}
            <span>{upCount}</span>
          </button>

          {/* Thumbs Down (Not true / Cleared) */}
          <button
            type="button"
            onClick={() => handleVote(-1)}
            disabled={isLoggedOut || isOwnReport || isVoting}
            title={
              isLoggedOut
                ? 'Sign in to vote'
                : isOwnReport
                  ? 'Cannot vote on your own report'
                  : 'Report is cleared or incorrect'
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-btn text-xs font-semibold transition-all ${
              userVote === -1
                ? 'bg-risk-severe text-white shadow-xs'
                : 'bg-surface hover:bg-surface-2 text-text border border-border'
            } ${
              isLoggedOut || isOwnReport ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
            }`}
          >
            {isVoting && userVote === -1 ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ThumbsDown size={12} className={userVote === -1 ? 'fill-white' : ''} />
            )}
            <span>{downCount}</span>
          </button>
        </div>
      </div>

      {/* Inline notices / errors */}
      {isOwnReport && (
        <span className="text-[10px] text-text-3 font-mono">You posted this report</span>
      )}
      {isLoggedOut && (
        <span className="text-[10px] text-text-3 font-mono">Sign in to vote & verify (+1 karma)</span>
      )}
      {errorMsg && (
        <span className="text-[10px] text-risk-severe font-medium">{errorMsg}</span>
      )}
    </div>
  );
};
