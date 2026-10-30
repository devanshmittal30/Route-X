import type React from 'react';
import { WifiOff, Info, AlertTriangle, X } from 'lucide-react';

export type BannerVariant = 'offline' | 'info' | 'disclaimer';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BannerVariant;
  onDismiss?: () => void;
  action?: React.ReactNode;
}

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  onDismiss,
  action,
  children,
  className = '',
  ...props
}) => {
  const configs = {
    offline: {
      bg: 'bg-surface-2 border-border text-text',
      icon: <WifiOff className="w-4 h-4 text-text-2 shrink-0" />,
    },
    info: {
      bg: 'bg-info-soft border-info/20 text-info',
      icon: <Info className="w-4 h-4 text-info shrink-0" />,
    },
    disclaimer: {
      bg: 'bg-surface border-border text-text-2',
      icon: <AlertTriangle className="w-4 h-4 text-text-3 shrink-0" />,
    },
  };

  const config = configs[variant];

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-btn border text-small ${config.bg} ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {config.icon}
        <div className="leading-snug break-words">{children}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
