
import { supabase } from '../lib/supabase';

export class StorageService {
  // Upload file to Supabase Storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    return data;
  }

  // Get public URL for a file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Download file blob
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  }

  // Delete file
  async deleteFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return data;
  }
}

export const storageService = new StorageService();
