/**
 * MyFeedbackList Component
 * 
 * Displays user's submitted feedback with color-coded status badges
 */

import React, { useEffect, useState } from 'react';
import { Clock, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import type { Feedback } from '../types/feedback.types';
import * as feedbackService from '../services/feedback.service';
import { useAuth } from '../hooks/useAuth';
import { formatDisplayDate } from '../utils/formatting';

export interface MyFeedbackListProps {
  refreshTrigger?: number;
}

/**
 * MyFeedbackList Component
 */
export const MyFeedbackList: React.FC<MyFeedbackListProps> = ({ refreshTrigger = 0 }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch feedback list
  const fetchFeedback = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await feedbackService.fetchMyFeedback(user.id);

      if (response.success && response.data) {
        setFeedback(response.data.feedback);
      } else {
        setError(response.error?.message || 'Failed to load feedback');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when refreshTrigger changes
  useEffect(() => {
    fetchFeedback();
  }, [user?.id, refreshTrigger]);

  // Status badge configuration
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        };
      case 'in_review':
      case 'in review':
        return {
          icon: <Eye className="h-3.5 w-3.5" />,
          label: 'In Review',
          className: 'bg-blue-100 text-blue-700 border-blue-300',
        };
      case 'resolved':
        return {
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          label: 'Resolved',
          className: 'bg-green-100 text-green-700 border-green-300',
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: 'Rejected',
          className: 'bg-red-100 text-red-700 border-red-300',
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: status,
          className: 'bg-slate-100 text-slate-700 border-slate-300',
        };
    }
  };

  // Category labels
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bug':
        return 'Bug Report';
      case 'feature_request':
        return 'Feature Request';
      case 'general':
        return 'General Feedback';
      default:
        return category;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('feedback.myFeedback')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" text={t('myFeedback.loading')} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('feedback.myFeedback')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (feedback.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('feedback.myFeedback')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={t('myFeedback.noFeedbackYet')}
            message={t('myFeedback.noFeedbackMessage')}
            icon={
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
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Feedback</CardTitle>
          <span className="text-sm text-slate-500">
            {feedback.length} submission{feedback.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedback.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            
            return (
              <div
                key={item.id}
                className="p-4 border border-slate-200 rounded-charming hover:border-electric-purple transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">
                      {getCategoryLabel(item.category)}
                    </span>
                    <Badge variant="pending" className={statusBadge.className}>
                      {statusBadge.icon}
                      <span className="ml-1">{statusBadge.label}</span>
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDisplayDate(new Date(item.createdAt))}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-slate-700 mb-2 leading-relaxed">
                  {item.message}
                </p>

                {/* Rating */}
                {item.rating && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, index) => (
                      <span
                        key={index}
                        className={index < item.rating! ? 'text-yellow-400' : 'text-slate-300'}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-xs text-slate-500 ml-2">
                      {item.rating} star{item.rating !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
