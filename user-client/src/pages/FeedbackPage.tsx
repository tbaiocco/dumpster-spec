import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/EmptyState';

/**
 * Feedback Page
 * User feedback submission and history
 * TODO: Implement in Phase 9
 */
export const FeedbackPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Feedback
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share Your Thoughts</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Feedback system coming soon"
            message="Help us improve Clutter.AI by sharing bugs, feature requests, and suggestions."
            icon={
              <svg className="h-12 w-12 text-bright-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};
