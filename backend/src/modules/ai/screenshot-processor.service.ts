import { Injectable, Logger } from '@nestjs/common';
import { VisionService } from './vision.service';

// Define interfaces for screenshot processing
interface ScreenshotMetadata {
  timestamp: Date;
  source: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  dimensions?: {
    width: number;
    height: number;
  };
  deviceInfo?: string;
}

interface ProcessedScreenshot {
  extractedText: string;
  confidence: number;
  detectedElements: ScreenshotElement[];
  metadata: ScreenshotMetadata;
  processingDuration: number;
}

interface ScreenshotElement {
  type: 'text' | 'ui_element' | 'code' | 'table' | 'form' | 'navigation';
  content: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

@Injectable()
export class ScreenshotProcessorService {
  private readonly logger = new Logger(ScreenshotProcessorService.name);

  constructor(private readonly visionService: VisionService) {}

  /**
   * Process screenshot image for text extraction and element detection
   */
  async processScreenshot(
    imageBuffer: Buffer,
    mimeType: string,
    metadata?: Partial<ScreenshotMetadata>,
  ): Promise<ProcessedScreenshot> {
    const startTime = Date.now();

    try {
      this.logger.log('Processing screenshot for text extraction');

      // Extract text using Vision service
      const ocrResult = await this.visionService.extractTextFromImage(
        imageBuffer,
        mimeType,
        ['en'], // Default to English, could be made configurable
      );

      // Detect UI elements and structure
      const elements = await this.detectScreenshotElements(
        imageBuffer,
        mimeType,
      );

      // Generate metadata with defaults
      const completeMetadata: ScreenshotMetadata = {
        timestamp: new Date(),
        source: 'unknown',
        ...metadata,
      };

      // Try to get image dimensions
      completeMetadata.dimensions ??= await this.getImageDimensions(
        imageBuffer,
        mimeType,
      );

      const processingDuration = Date.now() - startTime;

      const result: ProcessedScreenshot = {
        extractedText: ocrResult.text,
        confidence: ocrResult.confidence,
        detectedElements: elements,
        metadata: completeMetadata,
        processingDuration,
      };

      this.logger.log(
        `Screenshot processed in ${processingDuration}ms with confidence ${ocrResult.confidence}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process screenshot: ${error.message}`,
        error.stack,
      );
      throw new Error(`Screenshot processing failed: ${error.message}`);
    }
  }

  /**
   * Detect and classify elements in screenshot
   */
  private async detectScreenshotElements(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ScreenshotElement[]> {
    try {
      // Use vision service to analyze the screenshot structure
      const analysisResult = await this.visionService.analyzeImage({
        imageBuffer,
        mimeType,
        features: { textDetection: true },
      });

      const elements: ScreenshotElement[] = [];

      // Convert analysis results to screenshot elements
      // Use extracted text to create elements (simplified approach)
      if (analysisResult.extractedText) {
        const lines = analysisResult.extractedText
          .split('\n')
          .filter((line) => line.trim());
        for (const line of lines) {
          elements.push({
            type: this.classifyTextElement(line),
            content: line.trim(),
            confidence: analysisResult.textConfidence,
          });
        }
      }

      return elements;
    } catch (error) {
      this.logger.warn(`Element detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Classify text elements based on content patterns
   */
  private classifyTextElement(text: string): ScreenshotElement['type'] {
    const normalizedText = text.toLowerCase().trim();

    // Detect code patterns
    if (this.isCodeLike(text)) {
      return 'code';
    }

    // Detect navigation elements
    if (this.isNavigationLike(normalizedText)) {
      return 'navigation';
    }

    // Detect form elements
    if (this.isFormLike(normalizedText)) {
      return 'form';
    }

    // Detect table content
    if (this.isTableLike(text)) {
      return 'table';
    }

    // Detect UI elements
    if (this.isUIElementLike(normalizedText)) {
      return 'ui_element';
    }

    // Default to text
    return 'text';
  }

  /**
   * Check if text looks like code
   */
  private isCodeLike(text: string): boolean {
    const codePatterns = [
      /^\s*[{}[\]();,]+\s*$/, // Brackets and punctuation
      /^\s*(function|class|import|export|const|let|var|if|for|while)\s/i,
      /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:]\s*/, // Variable assignments
      /^\s*\/\/|^\s*\/\*|\*\/\s*$/, // Comments
      /^\s*<[^>]+>/, // HTML/XML tags
      /^\s*#[a-zA-Z_-]+/, // CSS selectors or comments
    ];

    return codePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Check if text looks like navigation
   */
  private isNavigationLike(text: string): boolean {
    const navKeywords = [
      'home',
      'back',
      'next',
      'previous',
      'menu',
      'settings',
      'profile',
      'logout',
      'login',
      'dashboard',
      'search',
      'help',
      'about',
      'contact',
      'breadcrumb',
    ];

    return (
      navKeywords.some((keyword) => text.includes(keyword)) ||
      /^\s*[←→↑↓<>]+\s*$/.test(text)
    ); // Arrow characters
  }

  /**
   * Check if text looks like form content
   */
  private isFormLike(text: string): boolean {
    const formPatterns = [
      /^\s*(email|password|username|phone|address|zip|postal)/i,
      /^\s*(submit|cancel|save|delete|update|create)/i,
      /^\s*\*\s*(required|mandatory)/i,
      /^\s*[a-zA-Z\s]+:\s*$/, // Label pattern
    ];

    return formPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Check if text looks like table content
   */
  private isTableLike(text: string): boolean {
    // Check for multiple columns/rows separated by whitespace or pipes
    return (
      /\s*\|\s*/.test(text) ||
      /^\s*\d+\s+[a-zA-Z]/.test(text) ||
      text.split(/\s+/).length >= 3
    );
  }

  /**
   * Check if text looks like UI element
   */
  private isUIElementLike(text: string): boolean {
    const uiKeywords = [
      'button',
      'click',
      'tap',
      'select',
      'choose',
      'download',
      'upload',
      'share',
      'copy',
      'paste',
      'close',
      'minimize',
      'maximize',
      'expand',
      'collapse',
    ];

    return (
      uiKeywords.some((keyword) => text.includes(keyword)) ||
      /^\s*[✓✗×◯◉▢▣]+\s*/.test(text)
    ); // Checkbox/radio patterns
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{ width: number; height: number } | undefined> {
    try {
      // Simple dimension detection for common formats
      if (mimeType === 'image/png') {
        return this.getPNGDimensions(imageBuffer);
      }

      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        return this.getJPEGDimensions(imageBuffer);
      }

      return undefined;
    } catch (error) {
      this.logger.warn(`Failed to get image dimensions: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Extract PNG dimensions from buffer
   */
  private getPNGDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | undefined {
    try {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (
        buffer.length < 24 ||
        !buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ) {
        return undefined;
      }

      // IHDR chunk starts at byte 8, width at byte 16, height at byte 20
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      return { width, height };
    } catch {
      return undefined;
    }
  }

  /**
   * Extract JPEG dimensions from buffer (simplified)
   */
  private getJPEGDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | undefined {
    try {
      // Look for SOF (Start of Frame) markers
      let offset = 2; // Skip JPEG signature

      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xff) {
          const marker = buffer[offset + 1];

          // SOF markers (0xC0-0xCF, excluding 0xC4, 0xC8, 0xCC)
          if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
          ) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);

            return { width, height };
          }

          // Skip this marker
          const length = buffer.readUInt16BE(offset + 2);
          offset += length + 2;
        } else {
          offset++;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Enhance text extraction for specific screenshot types
   */
  async processScreenshotWithContext(
    imageBuffer: Buffer,
    mimeType: string,
    context: {
      type:
        | 'mobile_app'
        | 'desktop_app'
        | 'web_page'
        | 'code_editor'
        | 'document';
      expectedLanguages?: string[];
      enhanceFor?: 'readability' | 'accuracy' | 'speed';
    },
  ): Promise<ProcessedScreenshot> {
    // For code editors, we might want different OCR settings
    if (context.type === 'code_editor') {
      this.logger.log('Processing screenshot with code editor optimizations');
    }

    // Determine source type
    let sourceType: 'mobile' | 'desktop' | 'tablet' | 'unknown' = 'unknown';
    if (context.type.includes('mobile')) {
      sourceType = 'mobile';
    } else if (context.type.includes('desktop')) {
      sourceType = 'desktop';
    }

    // Process with enhanced settings based on context
    const result = await this.processScreenshot(imageBuffer, mimeType, {
      source: sourceType,
    });

    return result;
  }
}
