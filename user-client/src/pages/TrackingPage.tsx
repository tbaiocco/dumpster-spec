import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/EmptyState';

/**
 * Tracking Page
 * Reminders and package tracking hub
 * TODO: Implement in Phase 7
 */
export const TrackingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Reminders & Tracking
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Active Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No reminders yet"
            message="Your reminders and package tracking information will appear here."
            icon={
              <svg className="h-12 w-12 text-electric-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};
