/**
 * Tracking Status Modal
 * 
 * Modal for adding checkpoints to trackable items
 */

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import type { TrackableItem, TrackingCheckpoint } from '../services/tracking.service';
import { addCheckpoint, TrackingStatus } from '../services/tracking.service';

interface TrackingStatusModalProps {
  tracking: TrackableItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TrackingStatusModal: React.FC<TrackingStatusModalProps> = ({
  tracking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<TrackingStatus>(tracking.status);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const checkpoint: Omit<TrackingCheckpoint, 'timestamp'> = {
        status,
        location: location || undefined,
        notes: notes || undefined,
        source: 'manual',
      };
      await addCheckpoint(tracking.id, checkpoint);
      onSuccess();
      onClose();
      // Reset form
      setLocation('');
      setNotes('');
      setStatus(tracking.status);
    } catch (err: any) {
      setError(err.message || 'Failed to add checkpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Tracking Checkpoint">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Item
          </label>
          <Input
            type="text"
            value={tracking.title}
            disabled
            className="bg-stone-50"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-stone-700 mb-1">
            Status *
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TrackingStatus)}
            className="w-full px-3 py-2 border border-stone-300 rounded-charming focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value={TrackingStatus.PENDING}>Pending</option>
            <option value={TrackingStatus.IN_PROGRESS}>In Progress</option>
            <option value={TrackingStatus.COMPLETED}>Completed</option>
            <option value={TrackingStatus.EXPIRED}>Expired</option>
            <option value={TrackingStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-1">
            Location
          </label>
          <Input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Memphis, TN or Processing Center"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-1">
            Notes
          </label>
          <TextArea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional checkpoint information..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-stone-200">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Adding...' : 'Add Checkpoint'}
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
