/**
 * Edit Reminder Modal
 * 
 * Modal for editing reminder details
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import type { Reminder, ReminderUpdateRequest } from '../services/reminders.service';
import { updateReminder, ReminderType, ReminderStatus } from '../services/reminders.service';
import { format } from 'date-fns';

interface EditReminderModalProps {
  reminder: Reminder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditReminderModal: React.FC<EditReminderModalProps> = ({
  reminder,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [message, setMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>(ReminderType.FOLLOW_UP);
  const [status, setStatus] = useState<ReminderStatus>(ReminderStatus.PENDING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with reminder data
  useEffect(() => {
    if (reminder) {
      setMessage(reminder.message);
      setScheduledFor(format(new Date(reminder.scheduled_for), "yyyy-MM-dd'T'HH:mm"));
      setReminderType(reminder.reminder_type);
      setStatus(reminder.status);
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError('Reminder message is required');
      return;
    }

    if (!scheduledFor) {
      setError('Reminder date is required');
      return;
    }

    try {
      setLoading(true);
      const updates: ReminderUpdateRequest = {
        message,
        scheduled_for: scheduledFor,
        reminder_type: reminderType,
        status,
      };
      await updateReminder(reminder.id, updates);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Reminder">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-1">
            Reminder Message
          </label>
          <TextArea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter reminder message..."
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="scheduledFor" className="block text-sm font-medium text-stone-700 mb-1">
            Scheduled Date & Time
          </label>
          <Input
            id="scheduledFor"
            type="datetime-local"
            value={scheduledFor.slice(0, 16)} // Format for datetime-local input
            onChange={(e) => setScheduledFor(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="reminderType" className="block text-sm font-medium text-stone-700 mb-1">
            Reminder Type
          </label>
          <select
            id="reminderType"
            value={reminderType}
            onChange={(e) => setReminderType(e.target.value as ReminderType)}
            className="w-full px-3 py-2 border border-stone-300 rounded-charming focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={ReminderType.FOLLOW_UP}>Follow Up</option>
            <option value={ReminderType.DEADLINE}>Deadline</option>
            <option value={ReminderType.RECURRING}>Recurring</option>
            <option value={ReminderType.LOCATION_BASED}>Location Based</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-stone-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReminderStatus)}
            className="w-full px-3 py-2 border border-stone-300 rounded-charming focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={ReminderStatus.PENDING}>Pending</option>
            <option value={ReminderStatus.SENT}>Sent</option>
            <option value={ReminderStatus.DISMISSED}>Dismissed</option>
            <option value={ReminderStatus.SNOOZED}>Snoozed</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4 border-t border-stone-200">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
