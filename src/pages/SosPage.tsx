
import { EmptyState } from '../components/ui/EmptyState';
import { LifeBuoy } from 'lucide-react';

export const SosPage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <LifeBuoy className="w-8 h-8 text-sos" />
        <h1 className="text-h1 font-bold text-sos">Emergency SOS</h1>
      </div>
      <p className="text-body text-text-2 mb-6">Immediate safety actions, emergency contacts, and safe shelters.</p>
      <EmptyState
        icon={LifeBuoy}
        title="Coming Soon"
        description="SOS emergency assist, nearest shelter finder, and SMS simulator will be implemented in Phase 6."
      />
    </div>
  );
};
