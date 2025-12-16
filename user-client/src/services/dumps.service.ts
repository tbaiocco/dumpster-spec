/**
 * Dumps API Service
 * 
 * Service layer for dump-related API operations
 * All endpoints automatically include userId from auth token via interceptor
 */

import { apiService, type ApiResponse } from './api';
import type { Dump } from '../types/dump.types';

/**
 * Fetch dumps for authenticated user
 * 
 * @param userId - User identifier as URL parameter
 * @returns Promise with dumps array
 */
export async function fetchDumps(
  userId: string
): Promise<ApiResponse<{ dumps: Dump[]; total: number }>> {
  return apiService.get(`/api/dumps/user/${userId}`);
}

/**
 * Fetch a single dump by ID
 * 
 * @param dumpId - Dump identifier
 * @returns Promise with dump data
 */
export async function fetchDumpById(dumpId: string): Promise<ApiResponse<Dump>> {
  return apiService.get(`/api/dumps/${dumpId}`);
}

/**
 * Update a dump (edit category/notes)
 * 
 * @param dumpId - Dump identifier
 * @param updates - Fields to update
 * @returns Promise with updated dump
 */
export async function updateDump(
  dumpId: string,
  updates: {
    category?: string;
    notes?: string;
  }
): Promise<ApiResponse<Dump>> {
  return apiService.patch(`/api/dumps/${dumpId}`, updates);
}

/**
 * Accept a dump (approve for processing)
 * 
 * @param dumpId - Dump identifier
 * @returns Promise with updated dump
 */
export async function acceptDump(dumpId: string): Promise<ApiResponse<Dump>> {
  return apiService.patch(`/api/dumps/${dumpId}`, { status: 'Approved' });
}

/**
 * Reject a dump
 * 
 * @param dumpId - Dump identifier
 * @param reason - Optional rejection reason
 * @returns Promise with updated dump
 */
export async function rejectDump(
  dumpId: string,
  reason?: string
): Promise<ApiResponse<Dump>> {
  return apiService.patch(`/api/dumps/${dumpId}`, {
    status: 'Rejected',
    notes: reason,
  });
}
