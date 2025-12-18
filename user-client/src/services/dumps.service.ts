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
 * Update a dump (edit category/notes/content)
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
    raw_content?: string;
    ai_summary?: string;
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
export async function acceptDump(
  dumpId: string,
  raw_content?: string,
  category_id?: string,
  notes?: string
): Promise<ApiResponse<Dump>> {
  return apiService.post(`/review/${dumpId}/approve`, { 
    raw_content: raw_content,
    category_id: category_id,
    notes: notes,
  });
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
  reason?: string,
  notes?: string
): Promise<ApiResponse<Dump>> {
  return apiService.post(`/review/${dumpId}/reject`, { 
    status: 'Rejected',
    reason: reason,
    notes: notes,
  });
}

/**
 * Create a new dump with enhanced processing
 * 
 * @param userId - User identifier
 * @param rawContent - Text content to process
 * @param contentType - Type of content (email, text, etc.)
 * @returns Promise with created dump
 */
export async function createDump(
  userId: string,
  rawContent: string,
  contentType: string = 'text'
): Promise<ApiResponse<Dump>> {
  return apiService.post('/api/dumps/enhanced', {
    userId,
    raw_content: rawContent,
    content_type: contentType,
  });
}

/**
 * Upload file as new dump
 * 
 * @param userId - User identifier
 * @param file - File to upload
 * @param caption - Optional caption
 * @returns Promise with created dump
 */
export async function uploadDump(
  userId: string,
  file: File,
  caption?: string
): Promise<ApiResponse<Dump>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  if (caption) {
    formData.append('caption', caption);
  }

  return apiService.post('/api/dumps/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Delete a dump permanently
 * 
 * @param dumpId - Dump identifier
 * @returns Promise with success response
 */
export async function deleteDump(dumpId: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiService.delete(`/api/dumps/${dumpId}`);
}
