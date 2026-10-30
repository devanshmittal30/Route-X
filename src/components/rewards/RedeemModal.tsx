import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DemoBadge } from '../ui/StatusBadges';
import { Offer } from '../../features/rewards/types';
import { redeemOffer } from '../../features/rewards/rewardsService';
import { Gift, Copy, Check, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';

export interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  userPoints: number;
  onRedeemSuccess?: (code: string, pointsSpent: number) => void;
}

export const RedeemModal: React.FC<RedeemModalProps> = ({
  isOpen,
  onClose,
  offer,
  userPoints,
  onRedeemSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  if (!offer) return null;

  const hasEnoughPoints = userPoints >= offer.points_cost;

  const handleClose = () => {
    setIssuedCode(null);
    setErrorMsg(null);
    setHasCopied(false);
    onClose();
  };

  const handleRedeem = async () => {
    if (!hasEnoughPoints || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await redeemOffer(offer.id);
      if (res.success && res.code) {
        setIssuedCode(res.code);
        onRedeemSuccess?.(res.code, res.points_spent || offer.points_cost);
      } else {
        setErrorMsg(res.error || 'Failed to redeem offer');
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to redeem offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // Ignore
    }
  };

  const expiryText = offer.valid_until
    ? new Date(offer.valid_until).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Valid for 90 days from redemption';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={issuedCode ? 'Demo Coupon Issued' : 'Redeem Partner Offer'}
    >
      <div className="space-y-4">
        {/* If coupon was already issued */}
        {issuedCode ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-full bg-accent-soft text-accent mb-2">
                <Gift size={28} />
              </div>
              <h3 className="text-h3 font-bold text-brand">Congratulations!</h3>
              <p className="text-xs text-text-2">
                Your coupon for <span className="font-semibold text-text">{offer.title}</span> is ready to use.
              </p>
            </div>

            {/* Coupon Certificate Box with DEMO Watermark */}
            <div className="relative overflow-hidden rounded-card border-2 border-dashed border-brand/30 bg-surface-2 p-5 text-center">
              {/* Prominent DEMO Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-15 rotate-[-22deg] font-black text-3xl sm:text-4xl text-brand uppercase tracking-widest">
                DEMO COUPON
              </div>

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <DemoBadge label="DEMO PARTNER COUPON" />
                </div>

                <div className="text-xs text-text-2 font-medium">
                  {offer.partner?.name || 'Verified Mountain Partner'} · {offer.partner?.city}
                </div>

                {/* JetBrains Mono Coupon Code */}
                <div className="py-2.5 px-4 bg-white border border-brand/20 rounded-btn shadow-xs inline-flex items-center gap-3">
                  <span className="font-mono font-bold text-2xl tracking-[0.2em] text-brand select-all">
                    {issuedCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-btn hover:bg-surface text-text-2 hover:text-brand transition-colors"
                    title="Copy coupon code"
                    aria-label="Copy coupon code"
                  >
                    {hasCopied ? (
                      <Check size={18} className="text-verified" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>

                {hasCopied && (
                  <p className="text-[11px] text-verified font-medium">Code copied to clipboard!</p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-3 font-mono">
                  <Calendar size={12} />
                  <span>Expires: {expiryText}</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="p-3 bg-surface rounded-card border border-border text-[11px] text-text-2 space-y-1">
              <div className="font-semibold text-text flex items-center gap-1">
                <ShieldCheck size={12} className="text-accent" />
                <span>Terms & Conditions</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-text-3 leading-relaxed">
                <li>Present this code upon arrival at the partner desk.</li>
                <li>Valid only at participating verified demo locations.</li>
                <li>Demonstration coupon for RouteX evaluation; not for resale or cash exchange.</li>
                <li>Limit 1 redemption per offer per registered user per day.</li>
              </ul>
            </div>

            <Button variant="primary" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          /* Confirmation & Eligibility View */
          <div className="space-y-4">
            <div className="p-3.5 bg-surface rounded-card border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-brand-soft text-brand shrink-0">
                <Gift size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-text text-sm">{offer.title}</h4>
                  <DemoBadge />
                </div>
                <p className="text-xs text-text-2">{offer.description}</p>
                <div className="text-[11px] text-text-3 font-mono">
                  Partner: {offer.partner?.name || 'Verified Mountain Partner'} ({offer.partner?.city})
                </div>
              </div>
            </div>

            {/* Points Cost Summary */}
            <div className="rounded-card border border-border p-3.5 space-y-2 bg-surface-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-2">Your current balance:</span>
                <span className="font-mono font-bold text-text">{userPoints} pts</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-2">Points required:</span>
                <span className="font-mono font-bold text-brand">-{offer.points_cost} pts</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-xs">
                <span className="font-medium text-text">Balance after redemption:</span>
                <span
                  className={`font-mono font-bold ${
                    hasEnoughPoints ? 'text-verified' : 'text-risk-severe'
                  }`}
                >
                  {hasEnoughPoints ? `${userPoints - offer.points_cost} pts` : 'Insufficient points'}
                </span>
              </div>
            </div>

            {/* Error Message if redemption fails */}
            {errorMsg && (
              <div className="p-3 bg-risk-severe-soft border border-risk-severe/30 rounded-card flex items-start gap-2 text-risk-severe text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {!hasEnoughPoints && (
              <p className="text-xs text-risk-severe font-medium text-center">
                You need {offer.points_cost - userPoints} more points to redeem this offer. Report or verify hazards to earn points!
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRedeem}
                disabled={!hasEnoughPoints || isSubmitting}
                loading={isSubmitting}
              >
                Confirm Redemption ({offer.points_cost} pts)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
