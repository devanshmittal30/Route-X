
import { EmptyState } from '../components/ui/EmptyState';
import { Hotel } from 'lucide-react';

export const StaysPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Safe Stays & Shelters</h1>
      <p className="text-body text-text-2 mb-6">Verified safe accommodations and partner shelters sorted by safety.</p>
      <EmptyState
        icon={Hotel}
        title="Coming Soon"
        description="Safe stays catalog and sponsored demo stays will be implemented in Phase 5."
      />
    </div>
  );
};
