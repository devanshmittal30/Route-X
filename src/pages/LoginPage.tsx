
import { EmptyState } from '../components/ui/EmptyState';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-[500px] w-full mx-auto px-4 py-12">
      <h1 className="text-h1 font-bold text-brand mb-2 text-center">Sign In</h1>
      <p className="text-body text-text-2 mb-8 text-center">Login keeps community hazard reports trustworthy.</p>
      <EmptyState
        icon={LogIn}
        title="Coming Soon"
        description="Google OAuth and email/password authentication will be implemented in Phase 5."
      />
    </div>
  );
};
