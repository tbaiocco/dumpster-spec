import React from 'react';
import { cn } from '../lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

/**
 * Loading spinner size mappings
 */
const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

/**
 * LoadingSpinner Component
 * Branded loading indicator with optional text
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-slate-200 border-t-electric-purple',
          spinnerSizes[size],
          className
        )}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm text-slate-600 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};
