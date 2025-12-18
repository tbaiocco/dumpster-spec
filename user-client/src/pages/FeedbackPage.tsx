import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FeedbackForm } from '../components/FeedbackForm';
import { MyFeedbackList } from '../components/MyFeedbackList';

/**
 * Feedback Page
 * 
 * Page for submitting feedback and viewing submission history
 */
export const FeedbackPage: React.FC = () => {
  const { t } = useTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Callback when feedback is successfully submitted
  const handleFeedbackSubmitted = () => {
    // Trigger MyFeedbackList to refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-outfit text-3xl font-bold text-slate-900 mb-2">
          {t('feedbackPage.title')}
        </h1>
        <p className="text-slate-600">
          {t('feedbackPage.subtitle')}
        </p>
      </div>

      {/* Feedback Form */}
      <FeedbackForm onSuccess={handleFeedbackSubmitted} />

      {/* Feedback History */}
      <MyFeedbackList refreshTrigger={refreshTrigger} />
    </div>
  );
};
