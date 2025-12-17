/**
 * Tracking Service
 * 
 * API service for tracking management (TrackableItems)
 */

import { apiService } from './api';

/**
 * Tracking type (matches backend)
 */
export const TrackingType = {
  PACKAGE: 'package',
  APPLICATION: 'application',
  SUBSCRIPTION: 'subscription',
  WARRANTY: 'warranty',
  LOAN: 'loan',
  INSURANCE: 'insurance',
  OTHER: 'other',
} as const;

export type TrackingType = typeof TrackingType[keyof typeof TrackingType];

/**
 * Tracking status (matches backend)
 */
export const TrackingStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type TrackingStatus = typeof TrackingStatus[keyof typeof TrackingStatus];

/**
 * Tracking checkpoint interface
 */
export interface TrackingCheckpoint {
  timestamp: Date;
  status: string;
  location?: string;
  notes?: string;
  source?: string;
}

/**
 * TrackableItem entity (matches backend structure)
 */
export interface TrackableItem {
  id: string;
  user_id: string;
  dump_id?: string;
  type: TrackingType;
  title: string;
  description?: string;
  status: TrackingStatus;
  start_date: string;
  expected_end_date?: string;
  actual_end_date?: string;
  metadata: Record<string, any>;
  checkpoints: TrackingCheckpoint[];
  reminder_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Get user's trackable items with optional filters
 */
export const getUserTrackableItems = async (params?: {
  type?: TrackingType;
  status?: TrackingStatus;
  activeOnly?: boolean;
}): Promise<TrackableItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.activeOnly !== undefined) queryParams.append('activeOnly', String(params.activeOnly));

  const response = await apiService.get<{ success: boolean; data: TrackableItem[]; count: number }>(
    `/api/tracking${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );
  // Backend returns { success, data, count }, and handleSuccess returns it as-is (since it has 'success')
  // So response IS the backend response, access data directly
  const backendResponse = response as any;
  return Array.isArray(backendResponse?.data) ? backendResponse.data : [];
};

/**
 * Create new trackable item
 */
export const createTrackableItem = async (
  item: Partial<TrackableItem>
): Promise<TrackableItem> => {
  const response = await apiService.post<TrackableItem>('/api/tracking', item);
  return response.data!;
};

/**
 * Update trackable item
 */
export const updateTrackableItem = async (
  trackingId: string,
  updates: Partial<TrackableItem>
): Promise<TrackableItem> => {
  const response = await apiService.put<TrackableItem>(
    `/api/tracking/${trackingId}`,
    updates
  );
  return response.data!;
};

/**
 * Add checkpoint to tracking item
 */
export const addCheckpoint = async (
  trackingId: string,
  checkpoint: Omit<TrackingCheckpoint, 'timestamp'>
): Promise<TrackableItem> => {
  const response = await apiService.post<TrackableItem>(
    `/api/tracking/${trackingId}/checkpoint`,
    checkpoint
  );
  return response.data!;
};

/**
 * Mark tracking item as completed
 */
export const completeTracking = async (trackingId: string): Promise<TrackableItem> => {
  const response = await apiService.put<TrackableItem>(
    `/api/tracking/${trackingId}/complete`
  );
  return response.data!;
};
