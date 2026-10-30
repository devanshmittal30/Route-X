
import { EmptyState } from '../components/ui/EmptyState';
import { Gift } from 'lucide-react';

export const RewardsPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Rewards & Coupons</h1>
      <p className="text-body text-text-2 mb-6">Earn points for verifying hazard reports and redeem demo partner offers.</p>
      <EmptyState
        icon={Gift}
        title="Coming Soon"
        description="Points ledger, reward badges, and demo coupon redemption will be implemented in Phase 5."
      />
    </div>
  );
};
