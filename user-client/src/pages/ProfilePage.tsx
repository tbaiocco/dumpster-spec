/**
 * Profile Page
 * 
 * User profile settings management page
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { fetchProfile, updateProfile, type UserProfile, type ProfileUpdateRequest } from '../services/profile.service';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');
  const [digestTime, setDigestTime] = useState('');
  const [emailDigest, setEmailDigest] = useState(true);
  const [instantNotifications, setInstantNotifications] = useState(true);
  const [reminderAlerts, setReminderAlerts] = useState(true);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProfile();
      setProfile(data);
      
      // Populate form fields
      setTimezone(data.timezone || '');
      setLanguage(data.language || '');
      setDigestTime(data.digest_time || '');
      setEmailDigest(data.notification_preferences?.email_digest ?? true);
      setInstantNotifications(data.notification_preferences?.instant_notifications ?? true);
      setReminderAlerts(data.notification_preferences?.reminder_alerts ?? true);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || t('profile.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setError(null);

    try {
      setSaving(true);
      const updates: ProfileUpdateRequest = {
        timezone,
        language,
        digest_time: digestTime,
        notification_preferences: {
          email_digest: emailDigest,
          instant_notifications: instantNotifications,
          reminder_alerts: reminderAlerts,
        },
      };

      const updated = await updateProfile(updates);
      setProfile(updated);
      
      // Update i18n language if it changed
      if (language && language !== i18n.language) {
        i18n.changeLanguage(language);
      }
      
      setSuccessMessage(t('profile.saved'));
    } catch (err: any) {
      setError(err.message || t('profile.failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If there's an error and no profile data, show error state with option to use form anyway
  if (error && !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-outfit font-bold text-stone-900 mb-8">
          Profile Settings
        </h1>
        <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Profile API Not Available
          </h2>
          <p className="text-yellow-800 mb-4">
            {error}
          </p>
          <p className="text-sm text-yellow-700">
            The <code className="bg-yellow-100 px-2 py-1 rounded">/auth/profile</code> endpoint needs to be implemented in the backend.
            This is a Phase 11 feature (T119-T121) that requires backend support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-outfit font-bold text-stone-900 mb-8">
        {t('profile.title')}
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Info (Read-only) */}
          <div>
            <h2 className="text-xl font-outfit font-semibold text-stone-900 mb-4">
              Account Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  User ID
                </label>
                <Input
                  type="text"
                  value={profile?.id || ''}
                  disabled
                  className="bg-stone-50"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h2 className="text-xl font-outfit font-semibold text-stone-900 mb-4">
              {t('profile.preferences')}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-stone-700 mb-1">
                  {t('profile.timezone')}
                </label>
                <Input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder={t('profile.timezonePlaceholder')}
                />
                <p className="text-xs text-stone-500 mt-1">
                  {t('profile.timezoneHelper')}
                </p>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-stone-700 mb-1">
                  {t('profile.language')}
                </label>
                <Input
                  id="language"
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder={t('profile.languagePlaceholder')}
                />
                <p className="text-xs text-stone-500 mt-1">
                  {t('profile.languageHelper')}
                </p>
              </div>

              <div>
                <label htmlFor="digestTime" className="block text-sm font-medium text-stone-700 mb-1">
                  {t('profile.digestTime')}
                </label>
                <Input
                  id="digestTime"
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                />
                <p className="text-xs text-stone-500 mt-1">
                  {t('profile.digestTimeHelper')}
                </p>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h2 className="text-xl font-outfit font-semibold text-stone-900 mb-4">
              {t('profile.notifications')}
            </h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailDigest}
                  onChange={(e) => setEmailDigest(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-stone-700">
                  Email Digest (daily summary of new dumps)
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instantNotifications}
                  onChange={(e) => setInstantNotifications(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-stone-700">
                  Instant Notifications (immediate alerts for new dumps)
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderAlerts}
                  onChange={(e) => setReminderAlerts(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-stone-700">
                  Reminder Alerts (notifications for upcoming reminders)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-stone-200">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadProfile}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
