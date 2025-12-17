/**
 * Tracking Service
 * 
 * API service for package tracking management
 */

import { apiService } from './api';

/**
 * Package tracking entity
 */
export interface PackageTracking {
  id: string;
  userId: string;
  dumpId?: string;
  trackingNumber: string;
  carrier?: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Track package request
 */
export interface TrackPackageRequest {
  trackingNumber: string;
  carrier?: string;
  notes?: string;
}

/**
 * Tracking status update request
 */
export interface TrackingStatusUpdate {
  status: string;
  currentLocation?: string;
  notes?: string;
}

/**
 * Track new package manually
 */
export const trackPackage = async (
  request: TrackPackageRequest
): Promise<PackageTracking> => {
  const response = await apiService.post<PackageTracking>(
    '/api/tracking/package',
    request
  );
  return response.data!;
};

/**
 * Auto-detect tracking numbers from dump content
 */
export const detectTracking = async (dumpId: string): Promise<PackageTracking[]> => {
  const response = await apiService.post<PackageTracking[]>(
    '/api/tracking/detect',
    { dumpId }
  );
  return response.data!;
};

/**
 * Update package tracking status
 */
export const updateTrackingStatus = async (
  trackingId: string,
  update: TrackingStatusUpdate
): Promise<PackageTracking> => {
  const response = await apiService.put<PackageTracking>(
    `/api/tracking/${trackingId}/status`,
    update
  );
  return response.data!;
};

/**
 * Mark package as delivered/completed
 */
export const completeTracking = async (trackingId: string): Promise<PackageTracking> => {
  const response = await apiService.put<PackageTracking>(
    `/api/tracking/${trackingId}/complete`
  );
  return response.data!;
};

/**
 * Get tracking details for a package
 */
export const getTracking = async (trackingId: string): Promise<PackageTracking> => {
  const response = await apiService.get<PackageTracking>(
    `/api/tracking/${trackingId}`
  );
  return response.data!;
};
