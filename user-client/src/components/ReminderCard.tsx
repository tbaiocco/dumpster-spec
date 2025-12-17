/**
 * Reminder Card
 * 
 * Card component for displaying reminder with action buttons
 */

import React, { useState } from 'react';
import { Clock, Edit2, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import type { Reminder } from '../services/reminders.service';
import { snoozeReminder, dismissReminder, ReminderStatus } from '../services/reminders.service';
import { format } from 'date-fns';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onUpdate: () => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onEdit,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState('');

  const handleSnooze = async () => {
    if (!snoozeDate) {
      alert('Please select a snooze date');
      return;
    }

    try {
      setLoading(true);
      await snoozeReminder(reminder.id, snoozeDate);
      onUpdate();
      setShowSnooze(false);
    } catch (err: any) {
      alert(err.message || 'Failed to snooze reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!confirm('Are you sure you want to dismiss this reminder?')) {
      return;
    }

    try {
      setLoading(true);
      await dismissReminder(reminder.id);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-stone-700">
              {reminder.scheduled_for ? format(new Date(reminder.scheduled_for), 'PPp') : 'No date set'}
            </span>
            {reminder.status === ReminderStatus.SNOOZED && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                Snoozed
              </span>
            )}
          </div>
          <p className="text-stone-900">{reminder.message || 'No message'}</p>
          {reminder.reminder_type && (
            <div className="mt-1 text-xs text-stone-500">
              Type: {reminder.reminder_type.replace(/_/g, ' ')}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSnooze(!showSnooze)}
            disabled={loading}
            title="Snooze reminder"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(reminder)}
            disabled={loading}
            title="Edit reminder"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            disabled={loading}
            title="Dismiss reminder"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showSnooze && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Snooze until:
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-stone-300 rounded-charming focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button
              size="sm"
              onClick={handleSnooze}
              disabled={loading || !snoozeDate}
            >
              {loading ? 'Snoozing...' : 'Snooze'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSnooze(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
