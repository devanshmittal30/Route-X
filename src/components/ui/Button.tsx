import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', icon, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variantStyles = {
      primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-hover shadow-sm',
      secondary: 'bg-white border border-border text-brand hover:bg-surface active:bg-surface-2 shadow-sm',
      danger: 'bg-sos text-white hover:opacity-95 active:opacity-90 shadow-sm',
      ghost: 'text-text-2 hover:bg-surface hover:text-text active:bg-surface-2',
    };

    const sizeStyles = {
      sm: 'h-9 min-h-[36px] px-3 text-small gap-1.5',
      md: 'h-11 min-h-[44px] px-4 text-body gap-2',
      lg: 'h-12 min-h-[48px] px-6 text-body gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
