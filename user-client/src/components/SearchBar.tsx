/**
 * SearchBar Component
 * 
 * Large search input with gradient border and icon
 */

import React, { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * SearchBar Component
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder,
  className,
}) => {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t('search.placeholder');
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Gradient border container */}
      <div className="p-[2px] rounded-charming-lg bg-gradient-primary">
        <div className="relative bg-white rounded-charming-lg">
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input */}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={defaultPlaceholder}
            className={cn(
              'w-full pl-14 pr-4 py-4 text-lg',
              'bg-transparent',
              'text-slate-900 placeholder-slate-400',
              'focus:outline-none',
              'rounded-charming-lg'
            )}
          />

          {/* Clear Button */}
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
