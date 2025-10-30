import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageConfig {
  private readonly logger = new Logger(StorageConfig.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase storage client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async uploadFile(
    bucket: string,
    filePath: string,
    file: Buffer | File,
    options?: {
      contentType?: string;
      upsert?: boolean;
    },
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: options?.contentType,
          upsert: options?.upsert || false,
        });

      if (error) {
        this.logger.error(`Upload failed for ${filePath}:`, error);
        return { data: null, error };
      }

      this.logger.log(`File uploaded successfully: ${filePath}`);
      return { data, error: null };
    } catch (error) {
      this.logger.error(`Upload exception for ${filePath}:`, error);
      return { data: null, error };
    }
  }

  async downloadFile(
    bucket: string,
    filePath: string,
  ): Promise<{ data: Blob | null; error: any }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) {
        this.logger.error(`Download failed for ${filePath}:`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      this.logger.error(`Download exception for ${filePath}:`, error);
      return { data: null, error };
    }
  }

  async getSignedUrl(
    bucket: string,
    filePath: string,
    expiresIn: number = 3600, // 1 hour default
  ): Promise<{ data: { signedUrl: string } | null; error: any }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        this.logger.error(
          `Signed URL generation failed for ${filePath}:`,
          error,
        );
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      this.logger.error(`Signed URL exception for ${filePath}:`, error);
      return { data: null, error };
    }
  }

  async deleteFile(
    bucket: string,
    filePath: string,
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        this.logger.error(`Delete failed for ${filePath}:`, error);
        return { data: null, error };
      }

      this.logger.log(`File deleted successfully: ${filePath}`);
      return { data, error: null };
    } catch (error) {
      this.logger.error(`Delete exception for ${filePath}:`, error);
      return { data: null, error };
    }
  }

  async listFiles(
    bucket: string,
    folder?: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folder, {
          limit: options?.limit,
          offset: options?.offset,
        });

      if (error) {
        this.logger.error(`List files failed for bucket ${bucket}:`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      this.logger.error(`List files exception for bucket ${bucket}:`, error);
      return { data: null, error };
    }
  }

  getPublicUrl(
    bucket: string,
    filePath: string,
  ): { data: { publicUrl: string } } {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);

    return { data };
  }
}
