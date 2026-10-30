
import { EmptyState } from '../components/ui/EmptyState';
import { Map as MapIcon } from 'lucide-react';

export const MapPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Hazard Map</h1>
      <p className="text-body text-text-2 mb-6">Interactive map with reports, earthquakes, and landslides.</p>
      <EmptyState
        icon={MapIcon}
        title="Coming Soon"
        description="Vector map viewer and live hazard layers will be implemented in Phase 3."
      />
    </div>
  );
};
