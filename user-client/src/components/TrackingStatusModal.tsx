/**
 * Tracking Status Modal
 * 
 * Modal for updating package tracking status
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import type { PackageTracking, TrackingStatusUpdate } from '../services/tracking.service';
import { updateTrackingStatus } from '../services/tracking.service';

interface TrackingStatusModalProps {
  tracking: PackageTracking;
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
  const [status, setStatus] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with tracking data
  useEffect(() => {
    if (tracking) {
      setStatus(tracking.status || '');
      setCurrentLocation(tracking.currentLocation || '');
      setNotes(tracking.notes || '');
    }
  }, [tracking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!status.trim()) {
      setError('Status is required');
      return;
    }

    try {
      setLoading(true);
      const update: TrackingStatusUpdate = {
        status,
        currentLocation: currentLocation || undefined,
        notes: notes || undefined,
      };
      await updateTrackingStatus(tracking.id, update);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update tracking status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Tracking Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Tracking Number
          </label>
          <Input
            type="text"
            value={tracking.trackingNumber}
            disabled
            className="bg-stone-50"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-stone-700 mb-1">
            Status *
          </label>
          <Input
            id="status"
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g., In Transit, Out for Delivery, Delivered"
            required
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-700 mb-1">
            Current Location
          </label>
          <Input
            id="location"
            type="text"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
            placeholder="e.g., Memphis, TN"
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
            placeholder="Additional tracking information..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-stone-200">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Updating...' : 'Update Status'}
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
