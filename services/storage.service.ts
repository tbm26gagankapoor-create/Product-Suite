/**
 * Storage Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class StorageService {
  // Upload file to local storage
  async uploadFile(bucket: string, path: string, file: File): Promise<{ path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    const response = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }

  // Delete file
  async deleteFile(bucket: string, path: string): Promise<void> {
    await fetch(`${API_BASE}/storage/${bucket}/${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }
}

export const storageService = new StorageService();
