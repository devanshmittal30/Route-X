
import { EmptyState } from '../components/ui/EmptyState';
import { Footprints } from 'lucide-react';

export const TrekPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Trek Mode</h1>
      <p className="text-body text-text-2 mb-6">High-contrast, battery-friendly tracking for walking trails.</p>
      <EmptyState
        icon={Footprints}
        title="Coming Soon"
        description="Trek mode and offline safety check-ins will be implemented in Phase 4."
      />
    </div>
  );
};
