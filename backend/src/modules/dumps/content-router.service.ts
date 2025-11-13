import { Injectable, Logger } from '@nestjs/common';

// Define content types
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  EMAIL = 'email',
  SCREENSHOT = 'screenshot',
  VOICE_MESSAGE = 'voice_message',
  HANDWRITTEN_NOTE = 'handwritten_note',
  CODE = 'code',
  URL = 'url',
  UNKNOWN = 'unknown',
}

// Define processing priorities
export enum ProcessingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Define routing destinations
export enum RoutingDestination {
  DOCUMENT_PROCESSOR = 'document_processor',
  SCREENSHOT_PROCESSOR = 'screenshot_processor',
  EMAIL_PROCESSOR = 'email_processor',
  VOICE_PROCESSOR = 'voice_processor',
  IMAGE_PROCESSOR = 'image_processor',
  MEDIA_PROCESSOR = 'media_processor',
  TEXT_PROCESSOR = 'text_processor',
  HANDWRITING_PROCESSOR = 'handwriting_processor',
}

// Define content analysis result
interface ContentAnalysis {
  contentType: ContentType;
  mimeType?: string;
  confidence: number;
  metadata: {
    hasText: boolean;
    hasImages: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
    fileSize?: number;
    language?: string;
    encoding?: string;
  };
  characteristics: {
    isStructured: boolean;
    isInteractive: boolean;
    hasMultiplePages: boolean;
    requiresOCR: boolean;
    requiresTranscription: boolean;
  };
}

// Define routing decision
interface RoutingDecision {
  primaryProcessor: RoutingDestination;
  secondaryProcessors: RoutingDestination[];
  priority: ProcessingPriority;
  estimatedProcessingTime: number; // in milliseconds
  requiredCapabilities: string[];
  processingOrder: RoutingDestination[];
}

@Injectable()
export class ContentRouterService {
  private readonly logger = new Logger(ContentRouterService.name);

  /**
   * Analyze content and determine its type and characteristics
   */
  async analyzeContent(
    buffer: Buffer,
    mimeType?: string,
    filename?: string,
    additionalMetadata?: Record<string, any>,
  ): Promise<ContentAnalysis> {
    try {
      this.logger.log(`Analyzing content: ${mimeType || 'unknown mime'}, ${filename || 'no filename'}`);

      // Determine content type based on multiple factors
      const contentType = this.determineContentType(buffer, mimeType, filename);
      
      // Calculate confidence based on available information
      const confidence = this.calculateConfidence(buffer, mimeType, filename, contentType);
      
      // Extract metadata
      const metadata = await this.extractContentMetadata(buffer, mimeType, contentType);
      
      // Analyze characteristics
      const characteristics = this.analyzeCharacteristics(buffer, mimeType, contentType, metadata);

      const analysis: ContentAnalysis = {
        contentType,
        mimeType,
        confidence,
        metadata,
        characteristics,
      };

      this.logger.log(`Content analyzed as ${contentType} with confidence ${confidence}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Failed to analyze content: ${error.message}`, error.stack);
      return {
        contentType: ContentType.UNKNOWN,
        confidence: 0.1,
        metadata: {
          hasText: false,
          hasImages: false,
          hasAudio: false,
          hasVideo: false,
        },
        characteristics: {
          isStructured: false,
          isInteractive: false,
          hasMultiplePages: false,
          requiresOCR: false,
          requiresTranscription: false,
        },
      };
    }
  }

  /**
   * Route content to appropriate processors based on analysis
   */
  async routeContent(analysis: ContentAnalysis): Promise<RoutingDecision> {
    try {
      this.logger.log(`Routing content of type ${analysis.contentType}`);

      const decision: RoutingDecision = {
        primaryProcessor: this.determinePrimaryProcessor(analysis),
        secondaryProcessors: this.determineSecondaryProcessors(analysis),
        priority: this.determinePriority(analysis),
        estimatedProcessingTime: this.estimateProcessingTime(analysis),
        requiredCapabilities: this.getRequiredCapabilities(analysis),
        processingOrder: [],
      };

      // Determine processing order
      decision.processingOrder = this.determineProcessingOrder(
        decision.primaryProcessor,
        decision.secondaryProcessors,
        analysis,
      );

      this.logger.log(`Content routed to ${decision.primaryProcessor} with ${decision.secondaryProcessors.length} secondary processors`);
      return decision;

    } catch (error) {
      this.logger.error(`Failed to route content: ${error.message}`, error.stack);
      // Return safe fallback routing
      return {
        primaryProcessor: RoutingDestination.TEXT_PROCESSOR,
        secondaryProcessors: [],
        priority: ProcessingPriority.NORMAL,
        estimatedProcessingTime: 5000,
        requiredCapabilities: ['text_processing'],
        processingOrder: [RoutingDestination.TEXT_PROCESSOR],
      };
    }
  }

  /**
   * Determine content type from buffer, mime type, and filename
   */
  private determineContentType(
    buffer: Buffer,
    mimeType?: string,
    filename?: string,
  ): ContentType {
    // Check mime type first
    const mimeResult = this.determineContentTypeFromMime(mimeType, buffer, filename);
    if (mimeResult !== ContentType.UNKNOWN) {
      return mimeResult;
    }

    // Check filename extension
    const filenameResult = this.determineContentTypeFromFilename(filename, buffer);
    if (filenameResult !== ContentType.UNKNOWN) {
      return filenameResult;
    }

    // Check buffer content patterns
    return this.detectContentFromBuffer(buffer);
  }

  /**
   * Determine content type from MIME type
   */
  private determineContentTypeFromMime(
    mimeType?: string,
    buffer?: Buffer,
    filename?: string,
  ): ContentType {
    if (!mimeType) return ContentType.UNKNOWN;

    // Treat generic binary MIME types as unknown to trigger filename detection
    if (mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
      return ContentType.UNKNOWN;
    }

    if (mimeType.startsWith('image/')) {
      return this.isLikelyScreenshot(buffer || Buffer.alloc(0), filename) 
        ? ContentType.SCREENSHOT 
        : ContentType.IMAGE;
    }
    
    if (mimeType.startsWith('audio/')) {
      return ContentType.VOICE_MESSAGE;
    }
    
    if (mimeType.startsWith('video/')) {
      return ContentType.VIDEO;
    }
    
    if (mimeType.startsWith('text/')) {
      return ContentType.TEXT;
    }
    
    if (mimeType === 'message/rfc822') {
      return ContentType.EMAIL;
    }
    
    if (this.isDocumentMimeType(mimeType)) {
      return ContentType.DOCUMENT;
    }

    return ContentType.UNKNOWN;
  }

  /**
   * Determine content type from filename
   */
  private determineContentTypeFromFilename(filename?: string, buffer?: Buffer): ContentType {
    if (!filename) return ContentType.UNKNOWN;

    const ext = this.getFileExtension(filename).toLowerCase();
    
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
      return this.isLikelyScreenshot(buffer || Buffer.alloc(0), filename)
        ? ContentType.SCREENSHOT
        : ContentType.IMAGE;
    }
    
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      return ContentType.VOICE_MESSAGE;
    }
    
    if (['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(ext)) {
      return ContentType.VIDEO;
    }
    
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return ContentType.DOCUMENT;
    }
    
    if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) {
      return ContentType.TEXT;
    }
    
    if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) {
      return ContentType.CODE;
    }

    return ContentType.UNKNOWN;
  }

  /**
   * Check if image is likely a screenshot
   */
  private isLikelyScreenshot(buffer: Buffer, filename?: string): boolean {
    // Check filename patterns
    if (filename) {
      const lowerFilename = filename.toLowerCase();
      const screenshotPatterns = [
        'screenshot', 'screen_shot', 'screen-shot',
        'capture', 'screen_capture', 'screen-capture',
        'snap', 'screen_snap', 'screen-snap'
      ];
      
      if (screenshotPatterns.some(pattern => lowerFilename.includes(pattern))) {
        return true;
      }
    }

    // Could add image dimension analysis, UI element detection, etc.
    // For now, rely on filename patterns
    return false;
  }

  /**
   * Check if mime type represents a document
   */
  private isDocumentMimeType(mimeType: string): boolean {
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    
    return documentMimeTypes.includes(mimeType);
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot + 1);
  }

  /**
   * Detect content type from buffer patterns
   */
  private detectContentFromBuffer(buffer: Buffer): ContentType {
    // Check for text content (UTF-8 encoded)
    try {
      const text = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
      if (this.isLikelyText(text)) {
        // Check if it looks like code
        if (this.isLikelyCode(text)) {
          return ContentType.CODE;
        }
        return ContentType.TEXT;
      }
    } catch {
      // Not valid UTF-8, continue with binary checks
    }

    // Check binary signatures
    const signature = buffer.subarray(0, 16);
    
    // PDF signature
    if (signature.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
      return ContentType.DOCUMENT;
    }
    
    // Image signatures
    if (signature.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
      return ContentType.IMAGE; // JPEG
    }
    
    if (signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return ContentType.IMAGE; // PNG
    }

    return ContentType.UNKNOWN;
  }

  /**
   * Check if text is likely readable text content
   */
  private isLikelyText(text: string): boolean {
    // Check for printable characters ratio
    const printableChars = text.split('').filter(char => {
      const code = char.codePointAt(0) || 0;
      return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13;
    });
    
    return printableChars.length / text.length > 0.8;
  }

  /**
   * Check if text looks like code
   */
  private isLikelyCode(text: string): boolean {
    const codeIndicators = [
      /^\s*[{}[\]();]+/m,
      /^\s*(function|class|import|export|const|let|var|if|for|while|def|public|private)\s/im,
      /^\s*<[^>]+>/m, // HTML tags
      /^\s*#[a-zA-Z_-]+/m, // CSS selectors or comments
    ];
    
    return codeIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Calculate confidence score for content type detection
   */
  private calculateConfidence(
    buffer: Buffer,
    mimeType?: string,
    filename?: string,
    contentType?: ContentType,
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Mime type provides strong indication
    if (mimeType) {
      confidence += 0.3;
    }
    
    // Filename extension provides good indication
    if (filename && this.getFileExtension(filename)) {
      confidence += 0.2;
    }
    
    // Buffer analysis provides additional confidence
    if (buffer.length > 0) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Extract metadata from content
   */
  private async extractContentMetadata(
    buffer: Buffer,
    mimeType?: string,
    contentType?: ContentType,
  ): Promise<ContentAnalysis['metadata']> {
    const metadata: ContentAnalysis['metadata'] = {
      hasText: false,
      hasImages: false,
      hasAudio: false,
      hasVideo: false,
      fileSize: buffer.length,
    };

    // Determine content presence based on type
    switch (contentType) {
      case ContentType.TEXT:
      case ContentType.CODE:
        metadata.hasText = true;
        break;
      case ContentType.IMAGE:
      case ContentType.SCREENSHOT:
        metadata.hasImages = true;
        metadata.hasText = true; // Images may contain text via OCR
        break;
      case ContentType.AUDIO:
      case ContentType.VOICE_MESSAGE:
        metadata.hasAudio = true;
        metadata.hasText = true; // Audio can be transcribed
        break;
      case ContentType.VIDEO:
        metadata.hasVideo = true;
        metadata.hasImages = true;
        metadata.hasAudio = true;
        metadata.hasText = true;
        break;
      case ContentType.DOCUMENT:
      case ContentType.EMAIL:
        metadata.hasText = true;
        metadata.hasImages = true; // Documents/emails may contain images/attachments
        break;
    }

    return metadata;
  }

  /**
   * Analyze content characteristics
   */
  private analyzeCharacteristics(
    buffer: Buffer,
    mimeType?: string,
    contentType?: ContentType,
    metadata?: ContentAnalysis['metadata'],
  ): ContentAnalysis['characteristics'] {
    const characteristics: ContentAnalysis['characteristics'] = {
      isStructured: false,
      isInteractive: false,
      hasMultiplePages: false,
      requiresOCR: false,
      requiresTranscription: false,
    };

    switch (contentType) {
      case ContentType.DOCUMENT:
        characteristics.isStructured = true;
        characteristics.hasMultiplePages = true;
        characteristics.requiresOCR = true; // May need OCR for scanned docs
        break;
      case ContentType.EMAIL:
        characteristics.isStructured = true;
        break;
      case ContentType.IMAGE:
      case ContentType.SCREENSHOT:
        characteristics.requiresOCR = true;
        break;
      case ContentType.AUDIO:
      case ContentType.VOICE_MESSAGE:
        characteristics.requiresTranscription = true;
        break;
      case ContentType.VIDEO:
        characteristics.requiresOCR = true;
        characteristics.requiresTranscription = true;
        break;
    }

    return characteristics;
  }

  /**
   * Determine primary processor for content type
   */
  private determinePrimaryProcessor(analysis: ContentAnalysis): RoutingDestination {
    switch (analysis.contentType) {
      case ContentType.SCREENSHOT:
        return RoutingDestination.SCREENSHOT_PROCESSOR;
      case ContentType.EMAIL:
        return RoutingDestination.EMAIL_PROCESSOR;
      case ContentType.VOICE_MESSAGE:
      case ContentType.AUDIO:
        return RoutingDestination.VOICE_PROCESSOR;
      case ContentType.IMAGE:
        return RoutingDestination.IMAGE_PROCESSOR;
      case ContentType.VIDEO:
        return RoutingDestination.MEDIA_PROCESSOR;
      case ContentType.DOCUMENT:
        return RoutingDestination.DOCUMENT_PROCESSOR;
      case ContentType.HANDWRITTEN_NOTE:
        return RoutingDestination.HANDWRITING_PROCESSOR;
      case ContentType.TEXT:
      case ContentType.CODE:
      case ContentType.URL:
      default:
        return RoutingDestination.TEXT_PROCESSOR;
    }
  }

  /**
   * Determine secondary processors that might be needed
   */
  private determineSecondaryProcessors(analysis: ContentAnalysis): RoutingDestination[] {
    const secondary: RoutingDestination[] = [];

    // Add OCR processor if needed
    if (analysis.characteristics.requiresOCR && 
        analysis.contentType !== ContentType.SCREENSHOT) {
      secondary.push(RoutingDestination.IMAGE_PROCESSOR);
    }

    // Add voice processor if needed
    if (analysis.characteristics.requiresTranscription &&
        analysis.contentType !== ContentType.VOICE_MESSAGE) {
      secondary.push(RoutingDestination.VOICE_PROCESSOR);
    }

    return secondary;
  }

  /**
   * Determine processing priority
   */
  private determinePriority(analysis: ContentAnalysis): ProcessingPriority {
    // High priority for structured content
    if (analysis.contentType === ContentType.EMAIL) {
      return ProcessingPriority.HIGH;
    }

    // Normal priority for most content
    if (analysis.contentType === ContentType.DOCUMENT ||
        analysis.contentType === ContentType.IMAGE ||
        analysis.contentType === ContentType.SCREENSHOT) {
      return ProcessingPriority.NORMAL;
    }

    // Low priority for media that requires heavy processing
    if (analysis.contentType === ContentType.VIDEO ||
        analysis.metadata.fileSize && analysis.metadata.fileSize > 10 * 1024 * 1024) {
      return ProcessingPriority.LOW;
    }

    return ProcessingPriority.NORMAL;
  }

  /**
   * Estimate processing time based on content characteristics
   */
  private estimateProcessingTime(analysis: ContentAnalysis): number {
    let baseTime = 1000; // 1 second base

    // Adjust for content type
    switch (analysis.contentType) {
      case ContentType.TEXT:
      case ContentType.CODE:
        baseTime = 500;
        break;
      case ContentType.IMAGE:
      case ContentType.SCREENSHOT:
        baseTime = 3000;
        break;
      case ContentType.AUDIO:
      case ContentType.VOICE_MESSAGE:
        baseTime = 5000;
        break;
      case ContentType.VIDEO:
        baseTime = 15000;
        break;
      case ContentType.DOCUMENT:
        baseTime = 8000;
        break;
    }

    // Adjust for file size
    if (analysis.metadata.fileSize) {
      const sizeFactor = Math.log10(analysis.metadata.fileSize / 1000) / 3;
      baseTime *= (1 + sizeFactor);
    }

    return Math.round(baseTime);
  }

  /**
   * Get required processing capabilities
   */
  private getRequiredCapabilities(analysis: ContentAnalysis): string[] {
    const capabilities: string[] = [];

    if (analysis.characteristics.requiresOCR) {
      capabilities.push('ocr');
    }

    if (analysis.characteristics.requiresTranscription) {
      capabilities.push('speech_to_text');
    }

    if (analysis.contentType === ContentType.EMAIL) {
      capabilities.push('email_parsing');
    }

    if (analysis.metadata.hasImages) {
      capabilities.push('image_processing');
    }

    capabilities.push('text_processing'); // Always needed

    return capabilities;
  }

  /**
   * Determine the order in which processors should be executed
   */
  private determineProcessingOrder(
    primary: RoutingDestination,
    secondary: RoutingDestination[],
    analysis: ContentAnalysis,
  ): RoutingDestination[] {
    const order: RoutingDestination[] = [primary];

    // Add secondary processors in logical order
    for (const processor of secondary) {
      if (!order.includes(processor)) {
        order.push(processor);
      }
    }

    return order;
  }
}