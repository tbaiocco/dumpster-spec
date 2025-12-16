import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Badge component variants using CVA
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-charming px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        overdue: 'bg-red-100 text-red-800 border border-red-200',
        pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        rejected: 'bg-gray-100 text-gray-800 border border-gray-200',
        processing: 'bg-blue-100 text-blue-800 border border-blue-200',
        default: 'bg-slate-100 text-slate-800 border border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge Component
 * Status indicator with Clutter.AI styling
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
