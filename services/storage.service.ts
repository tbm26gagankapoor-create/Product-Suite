/**
 * Storage Service - Uses Centralized HTTP Client
 */

import { getAuthHeaders } from '../lib/httpClient';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class StorageService {
  // Upload file to local storage
  async uploadFile(bucket: string, path: string, file: File): Promise<{ path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    // For file uploads, we use fetch directly since FormData needs special handling
    const headers = getAuthHeaders();
    // Remove Content-Type so browser can set it with boundary for multipart/form-data
    delete (headers as Record<string, string>)['Content-Type'];

    const response = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to upload file');
    return data.data;
  }

  // Get public URL for a file
  getPublicUrl(bucket: string, path: string): string {
    return `${API_BASE}/storage/${bucket}/${path}`;
  }

  // Download file blob
  async downloadFile(bucket: string, path: string): Promise<Blob> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
      headers,
    });

    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }

  // Delete file
  async deleteFile(bucket: string, path: string): Promise<void> {
    const headers = getAuthHeaders();
    await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
      method: 'DELETE',
      headers,
    });
  }
}

export const storageService = new StorageService();
