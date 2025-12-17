/**
 * Reminders Service
 * 
 * API service for reminder management
 */

import { apiService } from './api';

/**
 * Reminder type (matches backend)
 */
export const ReminderType = {
  FOLLOW_UP: 'follow_up',
  DEADLINE: 'deadline',
  RECURRING: 'recurring',
  LOCATION_BASED: 'location_based',
} as const;

export type ReminderType = typeof ReminderType[keyof typeof ReminderType];

/**
 * Reminder status (matches backend)
 */
export const ReminderStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DISMISSED: 'dismissed',
  SNOOZED: 'snoozed',
} as const;

export type ReminderStatus = typeof ReminderStatus[keyof typeof ReminderStatus];

/**
 * Reminder entity (matches backend structure)
 */
export interface Reminder {
  id: string;
  user_id: string;
  dump_id?: string;
  message: string;
  reminder_type: ReminderType;
  scheduled_for: string; // ISO 8601 datetime
  status: ReminderStatus;
  location_data?: Record<string, any>;
  recurrence_pattern?: Record<string, any>;
  ai_confidence?: number;
  created_at: string;
  sent_at?: string;
}

/**
 * Reminder update request
 */
export interface ReminderUpdateRequest {
  message?: string;
  scheduled_for?: string;
  status?: ReminderStatus;
  reminder_type?: ReminderType;
}

/**
 * Get user's reminders with optional filters
 */
export const getUserReminders = async (params?: {
  status?: ReminderStatus;
  type?: ReminderType;
  startDate?: string;
  endDate?: string;
  includeRecurring?: boolean;
}): Promise<Reminder[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.includeRecurring !== undefined) queryParams.append('includeRecurring', String(params.includeRecurring));

  const response = await apiService.get<{ success: boolean; reminders: Reminder[]; count: number }>(
    `/api/reminders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );
  // Backend returns { success, reminders, count }, and handleSuccess returns it as-is (since it has 'success')
  // So response IS the backend response, access reminders directly
  const backendResponse = response as any;
  return Array.isArray(backendResponse?.reminders) ? backendResponse.reminders : [];
};

/**
 * Snooze reminder until specified date/time
 */
export const snoozeReminder = async (
  reminderId: string,
  snoozeUntil: string
): Promise<Reminder> => {
  const response = await apiService.post<Reminder>(
    `/api/reminders/${reminderId}/snooze`,
    { snooze_until: snoozeUntil }
  );
  return response.data!;
};

/**
 * Dismiss reminder (mark as dismissed)
 */
export const dismissReminder = async (reminderId: string): Promise<Reminder> => {
  const response = await apiService.post<Reminder>(
    `/api/reminders/${reminderId}/dismiss`
  );
  return response.data!;
};

/**
 * Update reminder details
 */
export const updateReminder = async (
  reminderId: string,
  updates: ReminderUpdateRequest
): Promise<Reminder> => {
  const response = await apiService.put<Reminder>(
    `/api/reminders/${reminderId}`,
    updates
  );
  return response.data!;
};
