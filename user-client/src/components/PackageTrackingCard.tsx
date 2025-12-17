/**
 * Package Tracking Card
 * 
 * Card component for displaying package tracking with action buttons
 */

import React, { useState } from 'react';
import { Package, Edit2, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import type { PackageTracking } from '../services/tracking.service';
import { completeTracking } from '../services/tracking.service';
import { TrackingStatusModal } from './TrackingStatusModal';

interface PackageTrackingCardProps {
  tracking: PackageTracking;
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

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-medium text-stone-900">
                {tracking.trackingNumber}
              </span>
              {tracking.carrier && (
                <span className="text-xs text-stone-500">
                  via {tracking.carrier}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700">Status:</span>
                <span className="text-sm text-stone-900">{tracking.status}</span>
              </div>
              
              {tracking.currentLocation && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-700">Location:</span>
                  <span className="text-sm text-stone-600">{tracking.currentLocation}</span>
                </div>
              )}
              
              {tracking.estimatedDelivery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-700">Est. Delivery:</span>
                  <span className="text-sm text-stone-600">{tracking.estimatedDelivery}</span>
                </div>
              )}
              
              {tracking.notes && (
                <p className="text-sm text-stone-600 mt-2">{tracking.notes}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditModal(true)}
              disabled={loading}
              title="Update status"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleComplete}
              disabled={loading}
              title="Mark as delivered"
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
