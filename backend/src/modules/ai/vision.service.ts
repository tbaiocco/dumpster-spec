import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ImageAnalysisRequest {
  imageBuffer: Buffer;
  mimeType: string;
  features?: {
    textDetection?: boolean;
    objectDetection?: boolean;
    labelDetection?: boolean;
    safeSearchDetection?: boolean;
  };
  maxResults?: number;
}

export interface ImageAnalysisResponse {
  extractedText: string;
  textConfidence: number;
  detectedObjects?: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  labels?: Array<{
    description: string;
    confidence: number;
  }>;
  safeSearch?: {
    adult: string;
    medical: string;
    spoofed: string;
    violence: string;
    racy: string;
  };
  dominantColors?: string[];
  imageProperties?: {
    width: number;
    height: number;
    format: string;
  };
}

export interface GoogleVisionRequest {
  requests: Array<{
    image: {
      content: string; // base64 encoded
    };
    features: Array<{
      type: string;
      maxResults?: number;
    }>;
    imageContext?: {
      languageHints?: string[];
    };
  }>;
}

export interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
      locale?: string;
    }>;
    localizedObjectAnnotations?: Array<{
      name: string;
      score: number;
      boundingPoly?: {
        normalizedVertices: Array<{ x: number; y: number }>;
      };
    }>;
    labelAnnotations?: Array<{
      description: string;
      score: number;
      mid?: string;
    }>;
    safeSearchAnnotation?: {
      adult: string;
      medical: string;
      spoofed: string;
      violence: string;
      racy: string;
    };
    imagePropertiesAnnotation?: {
      dominantColors?: {
        colors: Array<{
          color: { red: number; green: number; blue: number };
          score: number;
          pixelFraction: number;
        }>;
      };
    };
    error?: {
      code: number;
      message: string;
      details: unknown[];
    };
  }>;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly keyFilePath: string;
  private readonly projectId: string;
  private readonly apiUrl = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(private readonly configService: ConfigService) {
    this.keyFilePath = this.configService.get<string>('GOOGLE_CLOUD_KEY_FILE') || '';
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || '';

    if (!this.keyFilePath || !this.projectId) {
      this.logger.warn('Google Cloud service account not configured');
    }
  }

  async extractTextFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    languageHints?: string[],
  ): Promise<{ text: string; confidence: number }> {
    this.logger.log(
      `Extracting text from image: ${mimeType}, ${imageBuffer.length} bytes`,
    );

    try {
      const result = await this.analyzeImage(
        {
          imageBuffer,
          mimeType,
          features: {
            textDetection: true,
          },
        },
        languageHints,
      );

      return {
        text: result.extractedText,
        confidence: result.textConfidence,
      };
    } catch (error) {
      this.logger.error('Error extracting text from image:', error);
      throw new Error(
        `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async analyzeImage(
    request: ImageAnalysisRequest,
    languageHints?: string[],
  ): Promise<ImageAnalysisResponse> {
    this.logger.log(
      `Analyzing image: ${request.mimeType}, ${request.imageBuffer.length} bytes`,
    );

    try {
      // Validate image format
      if (!this.isImageFormatSupported(request.mimeType)) {
        throw new Error(`Unsupported image format: ${request.mimeType}`);
      }

      // Validate image size
      const maxSizeBytes = 20 * 1024 * 1024; // 20MB
      if (request.imageBuffer.length > maxSizeBytes) {
        throw new Error(`Image too large: ${request.imageBuffer.length} bytes`);
      }

      // Convert image buffer to base64
      const imageContent = request.imageBuffer.toString('base64');

      // Build features array
      const features = this.buildFeaturesArray(
        request.features || { textDetection: true },
      );

      // Prepare the request
      const googleRequest: GoogleVisionRequest = {
        requests: [
          {
            image: {
              content: imageContent,
            },
            features,
            imageContext: languageHints ? { languageHints } : undefined,
          },
        ],
      };

      const response = await this.callGoogleVisionAPI(googleRequest);
      return this.parseAnalysisResponse(response, request.imageBuffer);
    } catch (error) {
      this.logger.error('Error analyzing image:', error);
      throw new Error(
        `Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async detectDocumentType(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{
    type:
      | 'receipt'
      | 'invoice'
      | 'business_card'
      | 'document'
      | 'handwritten'
      | 'unknown';
    confidence: number;
  }> {
    this.logger.log('Detecting document type');

    try {
      const result = await this.analyzeImage({
        imageBuffer,
        mimeType,
        features: {
          textDetection: true,
          labelDetection: true,
        },
        maxResults: 10,
      });

      return this.classifyDocumentType(result);
    } catch (error) {
      this.logger.error('Error detecting document type:', error);
      return { type: 'unknown', confidence: 0 };
    }
  }

  isImageValid(imageBuffer: Buffer, mimeType: string): boolean {
    try {
      // Basic validation
      if (imageBuffer.length === 0) {
        return false;
      }

      // Check if mime type is supported
      if (!this.isImageFormatSupported(mimeType)) {
        return false;
      }

      // Check file size
      const maxSizeBytes = 20 * 1024 * 1024; // 20MB
      if (imageBuffer.length > maxSizeBytes) {
        this.logger.warn(`Image file too large: ${imageBuffer.length} bytes`);
        return false;
      }

      // Basic format validation by checking headers
      return this.validateImageHeaders(imageBuffer, mimeType);
    } catch (error) {
      this.logger.error('Error validating image:', error);
      return false;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { GoogleAuth } = require('google-auth-library');
      
      this.logger.debug(`Attempting to authenticate with key file: ${this.keyFilePath}`);
      this.logger.debug(`Project ID: ${this.projectId}`);
      
      if (!this.keyFilePath) {
        throw new Error('GOOGLE_CLOUD_KEY_FILE environment variable not set');
      }
      
      const auth = new GoogleAuth({
        keyFile: this.keyFilePath,
        projectId: this.projectId,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      this.logger.debug('Google Auth client created, requesting access token...');
      
      const accessToken = await auth.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token returned from Google Cloud');
      }
      
      this.logger.debug('Access token obtained successfully');
      return accessToken;
    } catch (error) {
      this.logger.error('Error getting access token:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callGoogleVisionAPI(
    request: GoogleVisionRequest,
  ): Promise<GoogleVisionResponse> {
    if (!this.keyFilePath || !this.projectId) {
      throw new Error('Google Cloud service account not configured');
    }

    const accessToken = await this.getAccessToken();

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Vision API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<GoogleVisionResponse>;
  }

  private parseAnalysisResponse(
    response: GoogleVisionResponse,
    imageBuffer: Buffer,
  ): ImageAnalysisResponse {
    const result = response.responses[0];

    if (result.error) {
      throw new Error(`Vision API error: ${result.error.message}`);
    }

    const analysisResult: ImageAnalysisResponse = {
      extractedText: '',
      textConfidence: 0,
      imageProperties: this.getImageProperties(imageBuffer),
    };

    // Extract text
    if (result.textAnnotations && result.textAnnotations.length > 0) {
      // First annotation contains the full text
      analysisResult.extractedText =
        result.textAnnotations[0].description || '';
      // Estimate confidence based on text quality
      analysisResult.textConfidence = this.estimateTextConfidence(
        result.textAnnotations,
      );
    }

    // Extract objects
    if (result.localizedObjectAnnotations) {
      analysisResult.detectedObjects = result.localizedObjectAnnotations.map(
        (obj) => ({
          name: obj.name,
          confidence: obj.score,
          boundingBox: this.convertBoundingBox(
            obj.boundingPoly?.normalizedVertices,
          ),
        }),
      );
    }

    // Extract labels
    if (result.labelAnnotations) {
      analysisResult.labels = result.labelAnnotations.map((label) => ({
        description: label.description,
        confidence: label.score,
      }));
    }

    // Extract safe search
    if (result.safeSearchAnnotation) {
      analysisResult.safeSearch = result.safeSearchAnnotation;
    }

    // Extract dominant colors
    if (result.imagePropertiesAnnotation?.dominantColors?.colors) {
      analysisResult.dominantColors =
        result.imagePropertiesAnnotation.dominantColors.colors
          .slice(0, 5) // Top 5 colors
          .map(
            (colorInfo) =>
              `rgb(${colorInfo.color.red || 0}, ${colorInfo.color.green || 0}, ${colorInfo.color.blue || 0})`,
          );
    }

    return analysisResult;
  }

  private buildFeaturesArray(
    features: NonNullable<ImageAnalysisRequest['features']>,
  ): Array<{ type: string; maxResults?: number }> {
    const featureArray: Array<{ type: string; maxResults?: number }> = [];

    if (features.textDetection) {
      featureArray.push({ type: 'TEXT_DETECTION' });
    }

    if (features.objectDetection) {
      featureArray.push({ type: 'OBJECT_LOCALIZATION', maxResults: 10 });
    }

    if (features.labelDetection) {
      featureArray.push({ type: 'LABEL_DETECTION', maxResults: 10 });
    }

    if (features.safeSearchDetection) {
      featureArray.push({ type: 'SAFE_SEARCH_DETECTION' });
    }

    return featureArray;
  }

  private isImageFormatSupported(mimeType: string): boolean {
    const supportedFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/tiff',
      'image/tif',
      'application/pdf', // For single-page PDFs
    ];

    return supportedFormats.includes(mimeType.toLowerCase());
  }

  private validateImageHeaders(imageBuffer: Buffer, mimeType: string): boolean {
    if (imageBuffer.length < 8) {
      return false;
    }

    const header = imageBuffer.subarray(0, 8);

    switch (mimeType.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        // JPEG files start with 0xFF 0xD8
        return header[0] === 0xff && header[1] === 0xd8;

      case 'image/png':
        // PNG files start with PNG signature
        return (
          header[0] === 0x89 &&
          header[1] === 0x50 &&
          header[2] === 0x4e &&
          header[3] === 0x47
        );

      case 'image/gif':
        // GIF files start with "GIF87a" or "GIF89a"
        return header.subarray(0, 3).toString('ascii') === 'GIF';

      case 'image/bmp':
        // BMP files start with "BM"
        return header[0] === 0x42 && header[1] === 0x4d;

      case 'image/webp':
        // WebP files start with "RIFF" and contain "WEBP"
        return header.subarray(0, 4).toString('ascii') === 'RIFF';

      case 'image/tiff':
      case 'image/tif':
        // TIFF files start with either "II*\0" or "MM\0*"
        return (
          (header[0] === 0x49 &&
            header[1] === 0x49 &&
            header[2] === 0x2a &&
            header[3] === 0x00) ||
          (header[0] === 0x4d &&
            header[1] === 0x4d &&
            header[2] === 0x00 &&
            header[3] === 0x2a)
        );

      default:
        // For other formats, assume valid
        return true;
    }
  }

  private estimateTextConfidence(
    textAnnotations: GoogleVisionResponse['responses'][0]['textAnnotations'],
  ): number {
    if (!textAnnotations || textAnnotations.length === 0) {
      return 0;
    }

    // Use heuristics based on text characteristics
    const fullText = textAnnotations[0].description || '';

    let confidence = 0.5; // Base confidence

    // More text generally means higher confidence
    if (fullText.length > 100) confidence += 0.2;
    if (fullText.length > 500) confidence += 0.1;

    // Proper sentences increase confidence
    const sentenceCount = (fullText.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 0) confidence += 0.1;

    // Dictionary words increase confidence (simple check)
    const wordCount = fullText.split(/\s+/).length;
    const shortWordCount = fullText
      .split(/\s+/)
      .filter((word) => word.length <= 3).length;
    if (shortWordCount / wordCount < 0.3) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  private convertBoundingBox(
    vertices?: Array<{ x: number; y: number }>,
  ): { x: number; y: number; width: number; height: number } | undefined {
    if (!vertices || vertices.length < 2) {
      return undefined;
    }

    const xCoords = vertices.map((v) => v.x);
    const yCoords = vertices.map((v) => v.y);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private getImageProperties(imageBuffer: Buffer): {
    width: number;
    height: number;
    format: string;
  } {
    // Basic image property detection
    // This is a simplified version - a full implementation would use a proper image library

    const header = imageBuffer.subarray(0, 24);

    if (header[0] === 0xff && header[1] === 0xd8) {
      // JPEG - would need more complex parsing for dimensions
      return { width: 0, height: 0, format: 'JPEG' };
    }

    if (header[0] === 0x89 && header[1] === 0x50) {
      // PNG - dimensions are at bytes 16-23
      const width = header.readUInt32BE(16);
      const height = header.readUInt32BE(20);
      return { width, height, format: 'PNG' };
    }

    return { width: 0, height: 0, format: 'Unknown' };
  }

  private classifyDocumentType(analysis: ImageAnalysisResponse): {
    type:
      | 'receipt'
      | 'invoice'
      | 'business_card'
      | 'document'
      | 'handwritten'
      | 'unknown';
    confidence: number;
  } {
    const text = analysis.extractedText.toLowerCase();
    const labels =
      analysis.labels?.map((l) => l.description.toLowerCase()) || [];

    // Receipt indicators
    if (
      text.includes('receipt') ||
      text.includes('total') ||
      text.includes('subtotal') ||
      text.includes('tax') ||
      text.includes('$') ||
      text.includes('paid')
    ) {
      return { type: 'receipt', confidence: 0.8 };
    }

    // Invoice indicators
    if (
      text.includes('invoice') ||
      text.includes('bill to') ||
      text.includes('due date') ||
      text.includes('invoice number') ||
      text.includes('amount due')
    ) {
      return { type: 'invoice', confidence: 0.8 };
    }

    // Business card indicators
    if (
      (text.includes('@') && text.includes('.com')) ||
      text.includes('phone') ||
      text.includes('mobile') ||
      labels.includes('business card')
    ) {
      return { type: 'business_card', confidence: 0.7 };
    }

    // Handwritten indicators (heuristic)
    if (analysis.textConfidence < 0.6 && text.length > 0) {
      return { type: 'handwritten', confidence: 0.6 };
    }

    // General document
    if (text.length > 50) {
      return { type: 'document', confidence: 0.5 };
    }

    return { type: 'unknown', confidence: 0 };
  }

  getEstimatedCost(
    imageBuffer: Buffer,
    features: ImageAnalysisRequest['features'],
  ): number {
    // Google Cloud Vision API pricing (as of 2024)
    // OCR: $1.50 per 1000 requests
    // Object detection: $1.50 per 1000 requests
    // Label detection: $1.50 per 1000 requests
    // Safe search: $1.50 per 1000 requests

    let cost = 0;
    const baseCostPer1000 = 1.5;
    const costPerRequest = baseCostPer1000 / 1000;

    if (features?.textDetection) cost += costPerRequest;
    if (features?.objectDetection) cost += costPerRequest;
    if (features?.labelDetection) cost += costPerRequest;
    if (features?.safeSearchDetection) cost += costPerRequest;

    // If no features specified, assume text detection
    if (!features || Object.keys(features).length === 0) {
      cost = costPerRequest;
    }

    return cost;
  }
}
