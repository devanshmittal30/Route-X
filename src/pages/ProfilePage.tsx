
import { EmptyState } from '../components/ui/EmptyState';
import { User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">User Profile</h1>
      <p className="text-body text-text-2 mb-6">Manage emergency contacts, reports, trust score, and redeemed coupons.</p>
      <EmptyState
        icon={User}
        title="Coming Soon"
        description="Profile dashboard and emergency contact management will be implemented in Phase 5."
      />
    </div>
  );
};
