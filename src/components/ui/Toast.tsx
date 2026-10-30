import type React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const configs: Record<ToastType, { icon: React.ReactElement; border: string; iconColor: string }> = {
    info: {
      icon: <Info className="w-5 h-5 text-info" />,
      border: 'border-info/30',
      iconColor: 'text-info',
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-risk-low" />,
      border: 'border-risk-low/30',
      iconColor: 'text-risk-low',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-risk-moderate" />,
      border: 'border-risk-moderate/30',
      iconColor: 'text-risk-moderate',
    },
    danger: {
      icon: <AlertCircle className="w-5 h-5 text-risk-severe" />,
      border: 'border-risk-severe/30',
      iconColor: 'text-risk-severe',
    },
  };

  const config = configs[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 bg-white border ${config.border} rounded-card shadow-card max-w-sm w-full transition-all ${className}`}
    >
      <span className="shrink-0 mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="text-body font-semibold text-text">{title}</h4>
        {message && <p className="text-small text-text-2 mt-0.5 leading-snug">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="text-text-3 hover:text-text p-1 rounded hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
