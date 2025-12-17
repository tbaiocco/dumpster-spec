/**
 * FeedbackForm Component
 * 
 * Form for submitting product feedback with validation
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { cn } from '../lib/utils';
import * as feedbackService from '../services/feedback.service';
import { useToast } from './Toast';
import { useAuth } from '../hooks/useAuth';

export interface FeedbackFormProps {
  onSuccess?: () => void;
}

/**
 * FeedbackForm Component
 */
export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form validation
  const validateForm = (): boolean => {
    if (!category) {
      setValidationError('Please select a feedback category');
      return false;
    }
    if (message.trim().length < 10) {
      setValidationError('Message must be at least 10 characters');
      return false;
    }
    if (rating < 1 || rating > 5) {
      setValidationError('Please provide a rating between 1 and 5 stars');
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!user?.id) {
      addToast('error', 'You must be logged in to submit feedback');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const response = await feedbackService.submitFeedback({
        category,
        message: message.trim(),
        rating,
      });

      if (response.success) {
        addToast('success', "Feedback submitted! We'll review it soon.");
        
        // Clear form
        setCategory('');
        setMessage('');
        setRating(0);
        setValidationError(null);

        // Notify parent to refresh list
        if (onSuccess) {
          onSuccess();
        }
      } else {
        addToast('error', response.error?.message || 'Failed to submit feedback');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry after error
  const handleRetry = () => {
    handleSubmit(new Event('submit') as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Dropdown */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={cn(
                'w-full px-4 py-2 border rounded-charming text-sm',
                'focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                validationError?.includes('category') ? 'border-red-500' : 'border-slate-300'
              )}
              disabled={isSubmitting}
            >
              <option value="">Select a category...</option>
              <option value="bug">Bug Report</option>
              <option value="feature_request">Feature Request</option>
              <option value="general">General Feedback</option>
            </select>
          </div>

          {/* Rating Stars */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rating *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                  disabled={isSubmitting}
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      (hoveredRating >= star || rating >= star)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-300'
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-slate-600 ml-2">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <TextArea
              label="Message *"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what you think... (minimum 10 characters)"
              rows={5}
              helperText={`${message.length} characters (minimum 10 required)`}
              error={validationError?.includes('Message') ? validationError : undefined}
              disabled={isSubmitting}
            />
          </div>

          {/* Validation Error */}
          {validationError && !validationError.includes('Message') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-charming text-sm text-red-700">
              {validationError}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="default"
              loading={isSubmitting}
              className="flex-1"
            >
              Submit Feedback
            </Button>
            
            {validationError && (
              <Button
                type="button"
                onClick={handleRetry}
                variant="outline"
                disabled={isSubmitting}
              >
                Retry
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
