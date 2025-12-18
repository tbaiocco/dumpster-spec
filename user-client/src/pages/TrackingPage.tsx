/**
 * Tracking Page
 * 
 * Dedicated view for reminders and trackable items
 * Fetches from separate endpoints: /api/reminders and /api/tracking
 */

import React, { useEffect, useState } from 'react';
import { Bell, Package, Calendar, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getUserReminders, type Reminder } from '../services/reminders.service';
import { getUserTrackableItems, type TrackableItem } from '../services/tracking.service';
import { ReminderCard } from '../components/ReminderCard';
import { PackageTrackingCard } from '../components/PackageTrackingCard';
import { EditReminderModal } from '../components/EditReminderModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';

export const TrackingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Separate state for reminders and tracking
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [trackableItems, setTrackableItems] = useState<TrackableItem[]>([]);
  
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(true);
  
  const [errorReminders, setErrorReminders] = useState<string | null>(null);
  const [errorTracking, setErrorTracking] = useState<string | null>(null);
  
  // Edit modal state
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch reminders
  const fetchReminders = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingReminders(true);
      setErrorReminders(null);
      const data = await getUserReminders(); // Fetch all reminders without filter
      console.log('Fetched reminders:', data);
      setReminders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch reminders:', err);
      setErrorReminders(err.message || 'Failed to load reminders');
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  };

  // Fetch trackable items
  const fetchTrackableItems = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingTracking(true);
      setErrorTracking(null);
      const data = await getUserTrackableItems({ 
        activeOnly: true 
      });
      setTrackableItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch trackable items:', err);
      setErrorTracking(err.message || 'Failed to load tracking items');
      setTrackableItems([]);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (user?.id) {
      fetchReminders();
      fetchTrackableItems();
    }
  }, [user?.id]);

  // Edit reminder handlers
  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingReminder(null);
  };

  const handleReminderUpdate = () => {
    fetchReminders();
  };

  // Retry handlers
  const handleRetryReminders = () => {
    setErrorReminders(null);
    fetchReminders();
  };

  const handleRetryTracking = () => {
    setErrorTracking(null);
    fetchTrackableItems();
  };

  // Loading state - show while both are loading
  const isLoading = loadingReminders || loadingTracking;
  const hasNoData = (!reminders || reminders.length === 0) && (!trackableItems || trackableItems.length === 0);

  if (isLoading && hasNoData) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="xl" text={t('trackingPage.loading')} />
      </div>
    );
  }

  // Empty state - no reminders or tracking items
  if (hasNoData && !errorReminders && !errorTracking) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title={t('trackingPage.noItems')}
          message={t('trackingPage.noItemsMessage')}
          icon={
            <div className="flex gap-3">
              <Bell className="h-12 w-12 text-orange-300" />
              <Package className="h-12 w-12 text-cyan-300" />
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          {t('trackingPage.title')}
        </h1>
        <p className="text-slate-600 mt-1">
          {t('trackingPage.subtitle')}
        </p>
      </div>

      {/* Reminders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-heading font-semibold text-slate-900">
              {t('trackingPage.reminders')}
            </h2>
            <span className="text-sm text-slate-500">
              ({reminders?.length || 0})
            </span>
          </div>
          {loadingReminders && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>

        {errorReminders && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">{errorReminders}</p>
              <Button onClick={handleRetryReminders} variant="outline" size="sm">
                {t('common.retry')}
              </Button>
            </div>
          </div>
        )}

        {!loadingReminders && !errorReminders && reminders.length === 0 && (
          <div className="p-8 bg-slate-50 rounded-lg text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">{t('trackingPage.noActiveReminders')}</p>
          </div>
        )}

        {reminders && reminders.length > 0 && (
          <div className="space-y-3">
            {reminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onEdit={handleEditReminder}
                onUpdate={handleReminderUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tracking Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-600" />
            <h2 className="text-xl font-heading font-semibold text-slate-900">
              {t('trackingPage.trackableItems')}
            </h2>
            <span className="text-sm text-slate-500">
              ({trackableItems?.length || 0})
            </span>
          </div>
          {loadingTracking && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>

        {errorTracking && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">{errorTracking}</p>
              <Button onClick={handleRetryTracking} variant="outline" size="sm">
                {t('common.retry')}
              </Button>
            </div>
          </div>
        )}

        {!loadingTracking && !errorTracking && trackableItems.length === 0 && (
          <div className="p-8 bg-slate-50 rounded-lg text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">{t('trackingPage.noActiveTracking')}</p>
          </div>
        )}

        {trackableItems && trackableItems.length > 0 && (
          <div className="space-y-3">
            {trackableItems.map(item => (
              <PackageTrackingCard
                key={item.id}
                tracking={item}
                onUpdate={fetchTrackableItems}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <EditReminderModal
          reminder={editingReminder}
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSuccess={handleReminderUpdate}
        />
      )}
    </div>
  );
};
