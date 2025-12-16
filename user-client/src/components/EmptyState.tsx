import React from 'react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  } | React.ReactNode;
  className?: string;
}

/**
 * EmptyState Component
 * Displays friendly message when no content is available
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className,
}) => {
  const defaultIcon = (
    <svg
      className="h-12 w-12 text-slate-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        {icon || defaultIcon}
      </div>

      <h3 className="mb-2 text-lg font-heading font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mb-6 max-w-sm text-sm text-slate-600">
        {message}
      </p>

      {action && (
        typeof action === 'object' && 'label' in action ? (
          <Button onClick={action.onClick} variant="default">
            {action.label}
          </Button>
        ) : (
          action
        )
      )}
    </div>
  );
};
