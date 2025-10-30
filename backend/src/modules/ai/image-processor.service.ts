import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaProcessorService, MediaFile } from './media-processor.service';

export interface ImageAnalysis {
  id: string;
  originalUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  size: number;
  visualAnalysis?: {
    objects: Array<{
      name: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    faces: Array<{
      confidence: number;
      emotions: Record<string, number>;
      ageRange?: string;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    text: Array<{
      text: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    landmarks: Array<{
      name: string;
      confidence: number;
      location?: string;
    }>;
    colors: Array<{
      color: string;
      percentage: number;
      hex: string;
    }>;
  };
  ocrResult?: {
    extractedText: string;
    confidence: number;
    language: string;
    blocks: Array<{
      text: string;
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
  contentAnalysis?: {
    description: string;
    category: string;
    tags: string[];
    nsfw: boolean;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    context: string;
  };
  metadata: {
    source: 'telegram' | 'whatsapp';
    userId: string;
    messageId: string;
    processedAt: Date;
    processingTime: number;
  };
}

export interface ImageProcessingRequest {
  imageUrl: string;
  source: 'telegram' | 'whatsapp';
  userId: string;
  messageId: string;
  originalName?: string;
  analysisType?: 'basic' | 'full' | 'ocr_only' | 'vision_only';
}

export interface ImageProcessingResult {
  image: ImageAnalysis | null;
  success: boolean;
  error?: string;
  processingSteps: {
    download: boolean;
    validation: boolean;
    visualAnalysis: boolean;
    ocrAnalysis: boolean;
    contentAnalysis: boolean;
  };
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);
  
  // Image processing constraints
  private readonly constraints = {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    maxDimensions: {
      width: 4096,
      height: 4096,
    },
    minDimensions: {
      width: 32,
      height: 32,
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly mediaProcessor: MediaProcessorService
  ) {}

  async processImage(request: ImageProcessingRequest): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing image: ${request.imageUrl}`);

    const processingSteps = {
      download: false,
      validation: false,
      visualAnalysis: false,
      ocrAnalysis: false,
      contentAnalysis: false,
    };

    try {
      // Step 1: Download and validate image file
      const mediaResult = await this.mediaProcessor.processMedia({
        url: request.imageUrl,
        type: 'image',
        source: request.source,
        userId: request.userId,
        messageId: request.messageId,
        originalName: request.originalName,
      });

      if (!mediaResult.processed || !mediaResult.file) {
        throw new Error(`Media processing failed: ${mediaResult.error}`);
      }

      processingSteps.download = true;

      // Step 2: Validate image file
      await this.validateImageFile(mediaResult.file);
      processingSteps.validation = true;

      // Step 3: Extract basic image metadata
      const dimensions = await this.extractImageDimensions(mediaResult.file);

      // Create base image analysis object
      const imageAnalysis: ImageAnalysis = {
        id: mediaResult.file.id,
        originalUrl: request.imageUrl,
        dimensions,
        format: mediaResult.file.metadata.format || 'unknown',
        size: mediaResult.file.size,
        metadata: {
          source: request.source,
          userId: request.userId,
          messageId: request.messageId,
          processedAt: new Date(),
          processingTime: 0, // Will be updated at the end
        },
      };

      // Step 4: Perform visual analysis (if requested)
      if (request.analysisType !== 'ocr_only') {
        imageAnalysis.visualAnalysis = await this.performVisualAnalysis(mediaResult.file);
        processingSteps.visualAnalysis = true;
      }

      // Step 5: Perform OCR analysis (if requested)
      if (request.analysisType !== 'vision_only') {
        imageAnalysis.ocrResult = await this.performOCRAnalysis(mediaResult.file);
        processingSteps.ocrAnalysis = true;
      }

      // Step 6: Perform content analysis (if full analysis requested)
      if (request.analysisType === 'full' || !request.analysisType) {
        imageAnalysis.contentAnalysis = await this.performContentAnalysis(
          mediaResult.file,
          imageAnalysis.visualAnalysis,
          imageAnalysis.ocrResult
        );
        processingSteps.contentAnalysis = true;
      }

      // Update processing time
      imageAnalysis.metadata.processingTime = Date.now() - startTime;

      this.logger.log(`Image processed successfully: ${imageAnalysis.id}`);

      return {
        image: imageAnalysis,
        success: true,
        processingSteps,
      };

    } catch (error) {
      this.logger.error(`Image processing failed: ${error.message}`, error.stack);

      return {
        image: null,
        success: false,
        error: error.message,
        processingSteps,
      };
    }
  }

  async getImageAnalysis(imageId: string): Promise<ImageAnalysis | null> {
    try {
      const mediaFile = await this.mediaProcessor.getMediaFile(imageId);
      if (!mediaFile) {
        return null;
      }

      // In a real implementation, we would retrieve stored analysis data
      // For now, we'll return a basic structure
      return {
        id: mediaFile.id,
        originalUrl: mediaFile.url,
        dimensions: {
          width: mediaFile.metadata.width || 0,
          height: mediaFile.metadata.height || 0,
        },
        format: mediaFile.metadata.format || 'unknown',
        size: mediaFile.size,
        metadata: {
          source: 'telegram', // Would be stored in metadata
          userId: 'unknown',
          messageId: 'unknown',
          processedAt: new Date(),
          processingTime: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Error retrieving image analysis ${imageId}:`, error);
      return null;
    }
  }

  private async validateImageFile(mediaFile: MediaFile): Promise<void> {
    // Check MIME type
    if (!this.constraints.supportedFormats.includes(mediaFile.mimeType)) {
      throw new Error(`Unsupported image format: ${mediaFile.mimeType}`);
    }

    // Check file size
    if (mediaFile.size > this.constraints.maxFileSize) {
      throw new Error(`Image file too large: ${mediaFile.size} bytes (max: ${this.constraints.maxFileSize})`);
    }

    this.logger.log(`Image file validation passed: ${mediaFile.id}`);
  }

  private async extractImageDimensions(mediaFile: MediaFile): Promise<{ width: number; height: number }> {
    // In a real implementation, this would read the image file to get actual dimensions
    // For now, we'll use metadata if available or return defaults
    return {
      width: mediaFile.metadata.width || 800,
      height: mediaFile.metadata.height || 600,
    };
  }

  private async performVisualAnalysis(mediaFile: MediaFile): Promise<ImageAnalysis['visualAnalysis']> {
    try {
      this.logger.log(`Performing visual analysis: ${mediaFile.id}`);

      // Mock visual analysis implementation
      // In a real implementation, this would use Google Cloud Vision API or similar
      const visualAnalysis: ImageAnalysis['visualAnalysis'] = {
        objects: [
          {
            name: 'person',
            confidence: 0.9,
            boundingBox: { x: 100, y: 50, width: 200, height: 300 },
          },
          {
            name: 'car',
            confidence: 0.8,
            boundingBox: { x: 400, y: 200, width: 150, height: 100 },
          },
        ],
        faces: [
          {
            confidence: 0.95,
            emotions: {
              happy: 0.7,
              surprised: 0.2,
              neutral: 0.1,
            },
            ageRange: '25-35',
            boundingBox: { x: 150, y: 80, width: 80, height: 100 },
          },
        ],
        text: [
          {
            text: 'Sample Text',
            confidence: 0.9,
            boundingBox: { x: 50, y: 400, width: 200, height: 30 },
          },
        ],
        landmarks: [
          {
            name: 'Golden Gate Bridge',
            confidence: 0.85,
            location: 'San Francisco, CA',
          },
        ],
        colors: [
          {
            color: 'blue',
            percentage: 35.5,
            hex: '#4285F4',
          },
          {
            color: 'white',
            percentage: 28.2,
            hex: '#FFFFFF',
          },
          {
            color: 'green',
            percentage: 20.1,
            hex: '#34A853',
          },
        ],
      };

      this.logger.log(`Visual analysis completed: ${visualAnalysis.objects.length} objects detected`);
      return visualAnalysis;

    } catch (error) {
      this.logger.error(`Visual analysis error for ${mediaFile.id}:`, error);
      return undefined;
    }
  }

  private async performOCRAnalysis(mediaFile: MediaFile): Promise<ImageAnalysis['ocrResult']> {
    try {
      this.logger.log(`Performing OCR analysis: ${mediaFile.id}`);

      // Mock OCR implementation
      // In a real implementation, this would use Google Cloud Vision OCR or similar
      const ocrResult: ImageAnalysis['ocrResult'] = {
        extractedText: 'This is sample text extracted from the image. It would contain the actual OCR results.',
        confidence: 0.87,
        language: 'en',
        blocks: [
          {
            text: 'This is sample text',
            confidence: 0.9,
            boundingBox: { x: 50, y: 100, width: 300, height: 25 },
          },
          {
            text: 'extracted from the image',
            confidence: 0.85,
            boundingBox: { x: 50, y: 130, width: 250, height: 25 },
          },
        ],
      };

      this.logger.log(`OCR analysis completed: "${ocrResult.extractedText.substring(0, 50)}..."`);
      return ocrResult;

    } catch (error) {
      this.logger.error(`OCR analysis error for ${mediaFile.id}:`, error);
      return undefined;
    }
  }

  private async performContentAnalysis(
    mediaFile: MediaFile,
    visualAnalysis?: ImageAnalysis['visualAnalysis'],
    ocrResult?: ImageAnalysis['ocrResult']
  ): Promise<ImageAnalysis['contentAnalysis']> {
    try {
      this.logger.log(`Performing content analysis: ${mediaFile.id}`);

      // Analyze content based on visual analysis and OCR results
      const description = this.generateDescription(visualAnalysis, ocrResult);
      const category = this.categorizeContent(visualAnalysis, ocrResult);
      const tags = this.generateTags(visualAnalysis, ocrResult);
      const quality = this.assessImageQuality(mediaFile);

      const contentAnalysis: ImageAnalysis['contentAnalysis'] = {
        description,
        category,
        tags,
        nsfw: this.checkNSFW(visualAnalysis),
        quality,
        context: this.analyzeContext(visualAnalysis, ocrResult),
      };

      this.logger.log(`Content analysis completed: ${category} - ${description.substring(0, 50)}...`);
      return contentAnalysis;

    } catch (error) {
      this.logger.error(`Content analysis error for ${mediaFile.id}:`, error);
      return undefined;
    }
  }

  private generateDescription(
    visualAnalysis?: ImageAnalysis['visualAnalysis'],
    ocrResult?: ImageAnalysis['ocrResult']
  ): string {
    const parts: string[] = [];

    if (visualAnalysis?.objects && visualAnalysis.objects.length > 0) {
      const objectNames = visualAnalysis.objects.map(obj => obj.name).slice(0, 3);
      parts.push(`Image contains ${objectNames.join(', ')}`);
    }

    if (visualAnalysis?.faces && visualAnalysis.faces.length > 0) {
      parts.push(`${visualAnalysis.faces.length} face(s) detected`);
    }

    if (ocrResult?.extractedText?.trim()) {
      parts.push(`Contains text: "${ocrResult.extractedText.substring(0, 50)}..."`);
    }

    return parts.length > 0 
      ? parts.join('. ') 
      : 'Image processed successfully';
  }

  private categorizeContent(
    visualAnalysis?: ImageAnalysis['visualAnalysis'],
    ocrResult?: ImageAnalysis['ocrResult']
  ): string {
    // Simple categorization based on detected objects and text
    if (visualAnalysis?.objects) {
      const objectNames = visualAnalysis.objects.map(obj => obj.name.toLowerCase());
      
      if (objectNames.some(name => ['person', 'face'].includes(name))) return 'people';
      if (objectNames.some(name => ['car', 'vehicle', 'truck'].includes(name))) return 'transportation';
      if (objectNames.some(name => ['food', 'drink', 'meal'].includes(name))) return 'food';
      if (objectNames.some(name => ['building', 'house', 'architecture'].includes(name))) return 'architecture';
      if (objectNames.some(name => ['animal', 'dog', 'cat', 'bird'].includes(name))) return 'animals';
    }

    if (ocrResult?.extractedText) {
      const text = ocrResult.extractedText.toLowerCase();
      if (text.includes('receipt') || text.includes('invoice') || text.includes('$')) return 'document';
      if (text.includes('menu') || text.includes('restaurant')) return 'food';
      if (text.includes('ticket') || text.includes('flight')) return 'travel';
    }

    return 'general';
  }

  private generateTags(
    visualAnalysis?: ImageAnalysis['visualAnalysis'],
    ocrResult?: ImageAnalysis['ocrResult']
  ): string[] {
    const tags: string[] = [];

    // Add object-based tags
    if (visualAnalysis?.objects) {
      visualAnalysis.objects.forEach(obj => {
        if (obj.confidence > 0.7) {
          tags.push(obj.name.toLowerCase());
        }
      });
    }

    // Add color-based tags
    if (visualAnalysis?.colors) {
      visualAnalysis.colors.slice(0, 2).forEach(color => {
        if (color.percentage > 20) {
          tags.push(color.color);
        }
      });
    }

    // Add landmark-based tags
    if (visualAnalysis?.landmarks) {
      visualAnalysis.landmarks.forEach(landmark => {
        if (landmark.confidence > 0.8) {
          tags.push('landmark', landmark.name.toLowerCase().replace(/\s+/g, '_'));
        }
      });
    }

    // Add text-based tags
    if (ocrResult?.extractedText) {
      if (ocrResult.extractedText.length > 10) {
        tags.push('text', 'document');
      }
    }

    return [...new Set(tags)].slice(0, 10); // Remove duplicates and limit to 10 tags
  }

  private checkNSFW(visualAnalysis?: ImageAnalysis['visualAnalysis']): boolean {
    // Simple NSFW detection based on object detection
    // In a real implementation, this would use specialized NSFW detection models
    return false; // Default to safe
  }

  private assessImageQuality(mediaFile: MediaFile): 'poor' | 'fair' | 'good' | 'excellent' {
    // Quality assessment based on file size and dimensions
    const sizePerPixel = mediaFile.size / ((mediaFile.metadata.width || 800) * (mediaFile.metadata.height || 600));

    if (mediaFile.mimeType === 'image/png' && sizePerPixel > 3) return 'excellent';
    if (mediaFile.mimeType === 'image/jpeg' && sizePerPixel > 1) return 'good';
    if (sizePerPixel > 0.5) return 'fair';
    return 'poor';
  }

  private analyzeContext(
    visualAnalysis?: ImageAnalysis['visualAnalysis'],
    ocrResult?: ImageAnalysis['ocrResult']
  ): string {
    const contextClues: string[] = [];

    if (visualAnalysis?.landmarks && visualAnalysis.landmarks.length > 0) {
      contextClues.push(`Location: ${visualAnalysis.landmarks[0].location || 'Unknown'}`);
    }

    if (ocrResult?.extractedText?.includes('©')) {
      contextClues.push('May contain copyrighted content');
    }

    if (visualAnalysis?.faces && visualAnalysis.faces.length > 0) {
      contextClues.push('Contains people');
    }

    return contextClues.length > 0 ? contextClues.join(', ') : 'General image';
  }

  async deleteImageAnalysis(imageId: string): Promise<boolean> {
    try {
      // Delete the underlying media file
      const result = await this.mediaProcessor.deleteMediaFile(imageId);
      
      if (result) {
        this.logger.log(`Image analysis deleted: ${imageId}`);
        // In a real implementation, also delete analysis data
      }

      return result;

    } catch (error) {
      this.logger.error(`Error deleting image analysis ${imageId}:`, error);
      return false;
    }
  }

  async getProcessingStats(): Promise<{
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    categoryCounts: Record<string, number>;
  }> {
    // In a real implementation, this would query stored statistics
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      categoryCounts: {},
    };
  }
}