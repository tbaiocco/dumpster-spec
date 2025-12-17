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
import { updateReminder } from '../services/reminders.service';

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
  const [reminderText, setReminderText] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [status, setStatus] = useState<'active' | 'snoozed' | 'dismissed' | 'completed'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with reminder data
  useEffect(() => {
    if (reminder) {
      setReminderText(reminder.reminderText);
      setReminderDate(reminder.reminderDate);
      setStatus(reminder.status);
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reminderText.trim()) {
      setError('Reminder text is required');
      return;
    }

    if (!reminderDate) {
      setError('Reminder date is required');
      return;
    }

    try {
      setLoading(true);
      const updates: ReminderUpdateRequest = {
        reminderText,
        reminderDate,
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
          <label htmlFor="reminderText" className="block text-sm font-medium text-stone-700 mb-1">
            Reminder Text
          </label>
          <TextArea
            id="reminderText"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            placeholder="Enter reminder text..."
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="reminderDate" className="block text-sm font-medium text-stone-700 mb-1">
            Reminder Date & Time
          </label>
          <Input
            id="reminderDate"
            type="datetime-local"
            value={reminderDate.slice(0, 16)} // Format for datetime-local input
            onChange={(e) => setReminderDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-stone-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-stone-300 rounded-charming focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="active">Active</option>
            <option value="snoozed">Snoozed</option>
            <option value="dismissed">Dismissed</option>
            <option value="completed">Completed</option>
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
