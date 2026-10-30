
import { EmptyState } from '../components/ui/EmptyState';
import { Bell } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Live Alerts</h1>
      <p className="text-body text-text-2 mb-6">Disaster notifications, heavy rain warnings, and seismic activity.</p>
      <EmptyState
        icon={Bell}
        title="Coming Soon"
        description="Live area alerts strip and browser notifications will be implemented in Phase 4."
      />
    </div>
  );
};
