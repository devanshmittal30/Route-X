import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-small font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-text-3 flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={`w-full min-h-[44px] h-11 rounded-btn border bg-white px-3.5 text-body text-text placeholder:text-text-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent disabled:bg-surface-2 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${error ? 'border-risk-severe focus-visible:ring-risk-severe' : 'border-border'} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 pointer-events-none text-text-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-small text-risk-severe mt-1">{error}</p>}
        {!error && helperText && <p className="text-small text-text-3 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
