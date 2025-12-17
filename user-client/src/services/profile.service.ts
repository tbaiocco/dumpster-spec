/**
 * Profile Service
 * 
 * API service for user profile management
 */

import { apiService } from './api';

/**
 * User profile settings
 */
export interface UserProfile {
  id: string;
  email: string;
  timezone: string;
  language: string;
  digest_time?: string; // HH:MM format (e.g., "09:00")
  notification_preferences?: {
    email_digest?: boolean;
    instant_notifications?: boolean;
    reminder_alerts?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Profile update request payload
 */
export interface ProfileUpdateRequest {
  timezone?: string;
  language?: string;
  digest_time?: string;
  notification_preferences?: {
    email_digest?: boolean;
    instant_notifications?: boolean;
    reminder_alerts?: boolean;
  };
}

/**
 * Get authenticated user's profile
 */
export const fetchProfile = async (): Promise<UserProfile> => {
  const response = await apiService.get<UserProfile>('/auth/profile');
  return response.data!;
};

/**
 * Update authenticated user's profile
 */
export const updateProfile = async (updates: ProfileUpdateRequest): Promise<UserProfile> => {
  const response = await apiService.patch<UserProfile>('/auth/profile', updates);
  return response.data!;
};
