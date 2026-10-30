import type React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  className = '',
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-btn',
    circular: 'rounded-full',
    text: 'rounded h-4 my-1',
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-2 border border-border/40 ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};
