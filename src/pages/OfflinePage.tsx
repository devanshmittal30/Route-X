
import { EmptyState } from '../components/ui/EmptyState';
import { DownloadCloud } from 'lucide-react';

export const OfflinePage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Offline Maps & Storage</h1>
      <p className="text-body text-text-2 mb-6">Manage regional PMTiles and view cached safety data.</p>
      <EmptyState
        icon={DownloadCloud}
        title="Coming Soon"
        description="Offline map downloads and sync queue will be implemented in Phase 6."
      />
    </div>
  );
};
