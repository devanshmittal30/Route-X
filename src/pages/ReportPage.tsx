
import { EmptyState } from '../components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';

export const ReportPage: React.FC = () => {
  return (
    <div className="max-w-[800px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Report Hazard</h1>
      <p className="text-body text-text-2 mb-6">Contribute crowdsourced observations to warn fellow travellers.</p>
      <EmptyState
        icon={AlertCircle}
        title="Coming Soon"
        description="Hazard reporting form and photo upload will be implemented in Phase 5."
      />
    </div>
  );
};
