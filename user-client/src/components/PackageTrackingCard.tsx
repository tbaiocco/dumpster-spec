/**
 * Package Tracking Card
 * 
 * Card component for displaying trackable items (packages, applications, etc.)
 */

import React, { useState } from 'react';
import { Package, Edit2, CheckCircle, MapPin } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import type { TrackableItem } from '../services/tracking.service';
import { completeTracking, TrackingStatus } from '../services/tracking.service';
import { TrackingStatusModal } from './TrackingStatusModal';
import { format } from 'date-fns';

interface PackageTrackingCardProps {
  tracking: TrackableItem;
  onUpdate: () => void;
}

export const PackageTrackingCard: React.FC<PackageTrackingCardProps> = ({
  tracking,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleComplete = async () => {
    if (!confirm('Mark this package as delivered?')) {
      return;
    }

    try {
      setLoading(true);
      await completeTracking(tracking.id);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as delivered');
    } finally {
      setLoading(false);
    }
  };

  // Get latest checkpoint
  const latestCheckpoint = tracking.checkpoints && tracking.checkpoints.length > 0
    ? tracking.checkpoints[tracking.checkpoints.length - 1]
    : null;

  // Format type for display
  const typeLabel = tracking.type.replace('_', ' ');

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-medium text-stone-900">
                {tracking.title}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                {typeLabel}
              </span>
            </div>
            
            {tracking.description && (
              <p className="text-sm text-stone-600 mb-2">{tracking.description}</p>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700">Status:</span>
                <span className={`text-sm font-medium ${
                  tracking.status === TrackingStatus.COMPLETED ? 'text-green-600' :
                  tracking.status === TrackingStatus.IN_PROGRESS ? 'text-blue-600' :
                  tracking.status === TrackingStatus.EXPIRED ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {tracking.status.replace('_', ' ')}
                </span>
              </div>
              
              {latestCheckpoint && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-slate-50 rounded">
                  <MapPin className="h-3 w-3 text-slate-500 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    {latestCheckpoint.location && (
                      <div className="font-medium">{latestCheckpoint.location}</div>
                    )}
                    {latestCheckpoint.notes && (
                      <div>{latestCheckpoint.notes}</div>
                    )}
                    <div className="text-slate-500 mt-0.5">
                      {format(new Date(latestCheckpoint.timestamp), 'PPp')}
                    </div>
                  </div>
                </div>
              )}
              
              {tracking.expected_end_date && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  Expected: {format(new Date(tracking.expected_end_date), 'PP')}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditModal(true)}
              disabled={loading}
              title="Add checkpoint"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleComplete}
              disabled={loading}
              title="Mark as completed"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <TrackingStatusModal
        tracking={tracking}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onUpdate}
      />
    </>
  );
};
