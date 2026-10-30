import type React from 'react';
import { LucideIcon, Compass } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Compass,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-card border border-dashed border-border bg-surface ${className}`}>
      <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center text-brand mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      <p className="text-small text-text-2 max-w-sm mt-1 mb-4 leading-normal">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
