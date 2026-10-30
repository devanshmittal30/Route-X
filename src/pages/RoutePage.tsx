
import { EmptyState } from '../components/ui/EmptyState';
import { Navigation } from 'lucide-react';

export const RoutePage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Plan Route</h1>
      <p className="text-body text-text-2 mb-6">Drive and walking routes with segment-level risk assessment.</p>
      <EmptyState
        icon={Navigation}
        title="Coming Soon"
        description="Route planning panel and route risk scoring will be implemented in Phase 4."
      />
    </div>
  );
};
