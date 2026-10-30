
import { EmptyState } from '../components/ui/EmptyState';
import { Compass } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      <h1 className="text-h1 font-bold text-brand mb-2">Home</h1>
      <p className="text-body text-text-2 mb-6">Instant situational awareness and trip planner.</p>
      <EmptyState
        icon={Compass}
        title="Coming Soon"
        description="Home weather, live alerts, and route search will be implemented in subsequent phases."
      />
    </div>
  );
};
