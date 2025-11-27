import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

export interface MediaFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  localPath?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    checksum: string;
  };
}

export interface MediaProcessingRequest {
  url: string;
  type: 'image' | 'audio' | 'video' | 'document';
  source: 'telegram' | 'whatsapp';
  userId: string;
  messageId: string;
  originalName?: string;
}

export interface MediaProcessingResult {
  file: MediaFile | null;
  processed: boolean;
  error?: string;
  processingTime: number;
}

@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);
  private readonly supabase: SupabaseClient;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
    video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
    document: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async processMedia(
    request: MediaProcessingRequest,
  ): Promise<MediaProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing media: ${request.url} (type: ${request.type})`);

    try {
      // Validate request
      this.validateRequest(request);

      // Download file to temporary location
      const tempFile = await this.downloadFile(request);

      // Validate downloaded file
      await this.validateFile(tempFile, request.type);

      // Generate unique file ID and metadata
      const fileId = this.generateFileId(request);
      const metadata = await this.extractMetadata(tempFile, request.type);

      // Upload to Supabase Storage
      const storageUrl = await this.uploadToStorage(tempFile, fileId, request);

      // Create media file object
      const mediaFile: MediaFile = {
        id: fileId,
        originalName: request.originalName || path.basename(request.url),
        mimeType: tempFile.mimeType,
        size: tempFile.size,
        url: storageUrl,
        localPath: tempFile.path,
        metadata,
      };

      // Clean up temporary file
      await this.cleanupTempFile(tempFile.path);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Media processed successfully: ${fileId} (${processingTime}ms)`,
      );

      return {
        file: mediaFile,
        processed: true,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Media processing failed: ${error.message}`,
        error.stack,
      );

      return {
        file: null,
        processed: false,
        error: error.message,
        processingTime,
      };
    }
  }

  async getMediaFile(fileId: string): Promise<MediaFile | null> {
    try {
      // Get file metadata from storage
      const { data, error } = await this.supabase.storage
        .from('media')
        .list('', {
          search: fileId,
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const fileInfo = data[0];
      const { data: urlData } = await this.supabase.storage
        .from('media')
        .createSignedUrl(fileInfo.name, 3600); // 1 hour

      if (!urlData) {
        return null;
      }

      return {
        id: fileId,
        originalName: fileInfo.name,
        mimeType: fileInfo.metadata?.mimetype || 'application/octet-stream',
        size: fileInfo.metadata?.size || 0,
        url: urlData.signedUrl,
        metadata: {
          checksum: fileInfo.metadata?.checksum || '',
          width: fileInfo.metadata?.width,
          height: fileInfo.metadata?.height,
          duration: fileInfo.metadata?.duration,
          format: fileInfo.metadata?.format,
        },
      };
    } catch (error) {
      this.logger.error(`Error retrieving media file ${fileId}:`, error);
      return null;
    }
  }

  async deleteMediaFile(fileId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from('media')
        .remove([fileId]);

      if (error) {
        this.logger.error(`Error deleting media file ${fileId}:`, error);
        return false;
      }

      this.logger.log(`Media file deleted: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting media file ${fileId}:`, error);
      return false;
    }
  }

  private validateRequest(request: MediaProcessingRequest): void {
    if (!request.url) {
      throw new Error('Media URL is required');
    }

    if (
      !request.type ||
      !Object.keys(this.allowedTypes).includes(request.type)
    ) {
      throw new Error(`Invalid media type: ${request.type}`);
    }

    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (!request.messageId) {
      throw new Error('Message ID is required');
    }

    // Validate URL format
    try {
      new URL(request.url);
    } catch {
      throw new Error('Invalid media URL format');
    }
  }

  private async downloadFile(request: MediaProcessingRequest): Promise<{
    path: string;
    mimeType: string;
    size: number;
  }> {
    // Simple implementation that creates a mock file for demonstration
    // In a real implementation, you would use fetch() or a proper HTTP client

    const tempDir = os.tmpdir();
    const tempFileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Create a mock file with some content
    const mockContent = Buffer.from(
      `Mock ${request.type} file from ${request.url}`,
      'utf-8',
    );
    await fs.writeFile(tempFilePath, mockContent);

    return {
      path: tempFilePath,
      mimeType: this.allowedTypes[request.type][0], // Use first allowed type
      size: mockContent.length,
    };
  }

  private async validateFile(
    tempFile: { path: string; mimeType: string; size: number },
    type: string,
  ): Promise<void> {
    // Check file size
    if (tempFile.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    if (tempFile.size > this.maxFileSize) {
      throw new Error(`File too large: ${tempFile.size} bytes`);
    }

    // Basic file validation by reading first few bytes
    try {
      const buffer = Buffer.alloc(16);
      const file = await fs.open(tempFile.path, 'r');
      await file.read(buffer, 0, 16, 0);
      await file.close();

      // Validate file signatures for common types
      this.validateFileSignature(buffer, tempFile.mimeType);
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  private validateFileSignature(buffer: Buffer, mimeType: string): void {
    const signatures: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    };

    const expectedSignatures = signatures[mimeType];
    if (expectedSignatures) {
      const matches = expectedSignatures.some((signature) =>
        buffer.subarray(0, signature.length).equals(signature),
      );

      if (!matches) {
        throw new Error(`File signature doesn't match MIME type: ${mimeType}`);
      }
    }
  }

  private generateFileId(request: MediaProcessingRequest): string {
    const data = `${request.userId}_${request.messageId}_${request.url}_${Date.now()}`;
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  private async extractMetadata(
    tempFile: { path: string; mimeType: string; size: number },
    type: string,
  ): Promise<MediaFile['metadata']> {
    const fileContent = await fs.readFile(tempFile.path);
    const checksum = crypto.createHash('md5').update(fileContent).digest('hex');

    const metadata: MediaFile['metadata'] = {
      checksum,
      format: path.extname(tempFile.path).toLowerCase(),
    };

    // Extract type-specific metadata
    if (type === 'image') {
      // Basic image metadata extraction would go here
      // For now, we'll just set some defaults
      metadata.width = 0;
      metadata.height = 0;
    } else if (type === 'audio' || type === 'video') {
      // Audio/video metadata extraction would go here
      metadata.duration = 0;
    }

    return metadata;
  }

  private async uploadToStorage(
    tempFile: { path: string; mimeType: string; size: number },
    fileId: string,
    request: MediaProcessingRequest,
  ): Promise<string> {
    const fileBuffer = await fs.readFile(tempFile.path);
    const fileName = `${request.source}/${request.userId}/${fileId}`;

    const { data, error } = await this.supabase.storage
      .from('media')
      .upload(fileName, fileBuffer, {
        contentType: tempFile.mimeType,
        upsert: false,
        metadata: {
          userId: request.userId,
          messageId: request.messageId,
          source: request.source,
          type: request.type,
          size: tempFile.size.toString(),
          uploadedAt: new Date().toISOString(),
        },
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = await this.supabase.storage
      .from('media')
      .createSignedUrl(fileName, 86400); // 24 hours

    if (!urlData) {
      throw new Error('Failed to generate signed URL');
    }

    return urlData.signedUrl;
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase.storage
        .from('media')
        .list('', {
          limit: 1000,
        });

      if (error || !data) {
        return {
          totalFiles: 0,
          totalSize: 0,
          filesByType: {},
        };
      }

      const stats = {
        totalFiles: data.length,
        totalSize: data.reduce(
          (sum, file) => sum + (file.metadata?.size || 0),
          0,
        ),
        filesByType: {} as Record<string, number>,
      };

      for (const file of data) {
        const type = file.metadata?.type || 'unknown';
        stats.filesByType[type] = (stats.filesByType[type] || 0) + 1;
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
      };
    }
  }
}
