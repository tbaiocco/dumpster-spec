import { Injectable, Logger } from '@nestjs/common';
import { VisionService } from './vision.service';

// Define handwriting detection confidence levels
export enum HandwritingConfidence {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

// Define handwriting styles
export enum HandwritingStyle {
  CURSIVE = 'cursive',
  PRINT = 'print',
  MIXED = 'mixed',
  MESSY = 'messy',
  NEAT = 'neat',
  UNKNOWN = 'unknown',
}

// Define handwriting analysis result
interface HandwritingAnalysisResult {
  extractedText: string;
  confidence: number;
  confidenceLevel: HandwritingConfidence;
  handwritingStyle: HandwritingStyle;
  textBlocks: HandwritingTextBlock[];
  metadata: {
    imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
    rotation: number; // degrees
    skew: number; // degrees
    hasMultipleWriters: boolean;
    estimatedWriterCount: number;
  };
  processingTime: number;
}

// Define text block with handwriting-specific information
interface HandwritingTextBlock {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: HandwritingStyle;
  lineHeight: number;
  writingAngle: number; // baseline angle in degrees
  characteristics: {
    isTitle: boolean;
    isNote: boolean;
    isSignature: boolean;
    isList: boolean;
    hasUnderline: boolean;
    hasStrikethrough: boolean;
  };
}

// Define preprocessing options
interface PreprocessingOptions {
  enhanceContrast: boolean;
  reducenoise: boolean;
  correctRotation: boolean;
  correctSkew: boolean;
  normalizeSize: boolean;
}

@Injectable()
export class HandwritingService {
  private readonly logger = new Logger(HandwritingService.name);

  constructor(private readonly visionService: VisionService) {}

  /**
   * Recognize handwritten text from image
   */
  async recognizeHandwriting(
    imageBuffer: Buffer,
    mimeType: string,
    options?: {
      preprocessing?: Partial<PreprocessingOptions>;
      expectedLanguages?: string[];
      enhanceRecognition?: boolean;
    },
  ): Promise<HandwritingAnalysisResult> {
    const startTime = Date.now();

    try {
      this.logger.log('Starting handwriting recognition');

      // Preprocess image if requested
      let processedBuffer = imageBuffer;
      if (options?.preprocessing) {
        processedBuffer = await this.preprocessImage(imageBuffer, mimeType, options.preprocessing);
      }

      // Perform OCR with handwriting-specific settings
      const ocrResult = await this.performHandwritingOCR(
        processedBuffer,
        mimeType,
        options?.expectedLanguages,
      );

      // Analyze handwriting characteristics
      const handwritingAnalysis = await this.analyzeHandwritingCharacteristics(
        processedBuffer,
        mimeType,
        ocrResult,
      );

      // Extract text blocks with detailed information
      const textBlocks = this.extractHandwritingTextBlocks(ocrResult, handwritingAnalysis);

      // Combine all recognized text
      const extractedText = textBlocks.map(block => block.text).join('\n');

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(textBlocks);

      const processingTime = Date.now() - startTime;

      const result: HandwritingAnalysisResult = {
        extractedText,
        confidence: overallConfidence,
        confidenceLevel: this.getConfidenceLevel(overallConfidence),
        handwritingStyle: handwritingAnalysis.dominantStyle,
        textBlocks,
        metadata: handwritingAnalysis.metadata,
        processingTime,
      };

      this.logger.log(
        `Handwriting recognition completed in ${processingTime}ms with confidence ${overallConfidence}`,
      );

      return result;

    } catch (error) {
      this.logger.error(`Handwriting recognition failed: ${error.message}`, error.stack);
      throw new Error(`Handwriting recognition failed: ${error.message}`);
    }
  }

  /**
   * Detect if image contains handwriting
   */
  async detectHandwriting(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{
    hasHandwriting: boolean;
    confidence: number;
    handwritingPercentage: number;
    printedTextPercentage: number;
  }> {
    try {
      this.logger.log('Detecting handwriting in image');

      // Use vision service to analyze the image
      const analysisResult = await this.visionService.analyzeImage({
        imageBuffer,
        mimeType,
        features: { textDetection: true },
      });

      // Analyze text characteristics to determine handwriting vs printed text
      const handwritingScore = this.analyzeTextForHandwriting(analysisResult.extractedText);

      const hasHandwriting = handwritingScore.handwritingPercentage > 0.3; // 30% threshold

      return {
        hasHandwriting,
        confidence: handwritingScore.confidence,
        handwritingPercentage: handwritingScore.handwritingPercentage,
        printedTextPercentage: handwritingScore.printedTextPercentage,
      };

    } catch (error) {
      this.logger.error(`Handwriting detection failed: ${error.message}`, error.stack);
      return {
        hasHandwriting: false,
        confidence: 0,
        handwritingPercentage: 0,
        printedTextPercentage: 0,
      };
    }
  }

  /**
   * Preprocess image for better handwriting recognition
   */
  private async preprocessImage(
    imageBuffer: Buffer,
    mimeType: string,
    options: Partial<PreprocessingOptions>,
  ): Promise<Buffer> {
    // In a real implementation, this would use image processing libraries
    // For now, return the original buffer
    this.logger.log('Image preprocessing requested but not implemented - returning original');
    return imageBuffer;
  }

  /**
   * Perform OCR optimized for handwriting
   */
  private async performHandwritingOCR(
    imageBuffer: Buffer,
    mimeType: string,
    languageHints?: string[],
  ): Promise<any> {
    // Use vision service with specific settings for handwriting
    const result = await this.visionService.extractTextFromImage(
      imageBuffer,
      mimeType,
      languageHints,
    );

    return {
      text: result.text,
      confidence: result.confidence,
      // In a real implementation, this would include more detailed OCR results
      // like word-level confidence, bounding boxes, etc.
    };
  }

  /**
   * Analyze handwriting characteristics
   */
  private async analyzeHandwritingCharacteristics(
    imageBuffer: Buffer,
    mimeType: string,
    ocrResult: any,
  ): Promise<{
    dominantStyle: HandwritingStyle;
    metadata: HandwritingAnalysisResult['metadata'];
  }> {
    // Analyze text characteristics to determine handwriting style
    const style = this.determineHandwritingStyle(ocrResult.text);

    // Analyze image quality and characteristics
    const imageQuality = this.analyzeImageQuality(imageBuffer);

    return {
      dominantStyle: style,
      metadata: {
        imageQuality,
        rotation: 0, // Would be calculated from image analysis
        skew: 0, // Would be calculated from image analysis
        hasMultipleWriters: this.detectMultipleWriters(ocrResult.text),
        estimatedWriterCount: 1, // Simplified for now
      },
    };
  }

  /**
   * Determine handwriting style from text characteristics
   */
  private determineHandwritingStyle(text: string): HandwritingStyle {
    // Analyze text patterns to determine style
    // This is a simplified heuristic approach

    const characteristics = {
      hasConnectedLetters: this.detectConnectedLetters(text),
      hasInconsistentSpacing: this.detectInconsistentSpacing(text),
      hasIrregularBaseline: this.detectIrregularBaseline(text),
      hasVariableLetterSize: this.detectVariableLetterSize(text),
    };

    // Determine style based on characteristics
    if (characteristics.hasConnectedLetters) {
      return HandwritingStyle.CURSIVE;
    }

    if (characteristics.hasInconsistentSpacing || characteristics.hasIrregularBaseline) {
      return HandwritingStyle.MESSY;
    }

    if (characteristics.hasVariableLetterSize) {
      return HandwritingStyle.MIXED;
    }

    // Default to print style
    return HandwritingStyle.PRINT;
  }

  /**
   * Extract text blocks with handwriting-specific information
   */
  private extractHandwritingTextBlocks(
    ocrResult: any,
    analysis: { dominantStyle: HandwritingStyle },
  ): HandwritingTextBlock[] {
    // Split text into logical blocks (lines, paragraphs)
    const lines = ocrResult.text.split('\n').filter((line: string) => line.trim());

    return lines.map((line: string, index: number) => {
      const blockCharacteristics = this.analyzeTextBlockCharacteristics(line);

      return {
        text: line,
        confidence: ocrResult.confidence || 0.8,
        boundingBox: {
          x: 0, // Would be calculated from OCR results
          y: index * 30, // Estimated line height
          width: line.length * 10, // Estimated width
          height: 25, // Estimated height
        },
        style: analysis.dominantStyle,
        lineHeight: 25,
        writingAngle: 0, // Would be calculated from line analysis
        characteristics: blockCharacteristics,
      };
    });
  }

  /**
   * Analyze text block characteristics
   */
  private analyzeTextBlockCharacteristics(text: string): HandwritingTextBlock['characteristics'] {
    return {
      isTitle: this.isLikelyTitle(text),
      isNote: this.isLikelyNote(text),
      isSignature: this.isLikelySignature(text),
      isList: this.isLikelyListItem(text),
      hasUnderline: false, // Would be detected from image analysis
      hasStrikethrough: false, // Would be detected from image analysis
    };
  }

  /**
   * Check if text is likely a title
   */
  private isLikelyTitle(text: string): boolean {
    return (
      text.length < 50 &&
      (text === text.toUpperCase() || 
       /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(text))
    );
  }

  /**
   * Check if text is likely a note
   */
  private isLikelyNote(text: string): boolean {
    const noteKeywords = ['note:', 'remember:', 'todo:', 'important:', 'reminder:'];
    return noteKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if text is likely a signature
   */
  private isLikelySignature(text: string): boolean {
    return (
      text.length < 30 &&
      text.split(' ').length <= 3 &&
      /^[A-Z][a-z]+([\s\-.][A-Z][a-z]+)*$/.test(text)
    );
  }

  /**
   * Check if text is likely a list item
   */
  private isLikelyListItem(text: string): boolean {
    return /^[\d\-*•]\s+/.test(text.trim());
  }

  /**
   * Detect connected letters (cursive writing indicator)
   */
  private detectConnectedLetters(text: string): boolean {
    // This would analyze the actual image in a real implementation
    // For now, use text-based heuristics
    const cursiveIndicators = ['th', 'll', 'ff', 'tt'];
    return cursiveIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect inconsistent spacing
   */
  private detectInconsistentSpacing(text: string): boolean {
    const words = text.split(' ');
    if (words.length < 2) return false;

    // Check for very short or very long words mixed together
    const wordLengths = words.map(word => word.length);
    const avgLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
    const variance = wordLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / wordLengths.length;

    return variance > 10; // High variance indicates inconsistent spacing
  }

  /**
   * Detect irregular baseline
   */
  private detectIrregularBaseline(text: string): boolean {
    // This would analyze actual letter positions in a real implementation
    // For now, check for mixed case which might indicate irregular writing
    return /[a-z][A-Z]|[A-Z][a-z]/.test(text.replaceAll(/\s/g, ''));
  }

  /**
   * Detect variable letter sizes
   */
  private detectVariableLetterSize(text: string): boolean {
    // Check for mixed case and number patterns
    return /[a-z].*[A-Z].*\d|[A-Z].*[a-z].*\d/.test(text);
  }

  /**
   * Detect multiple writers
   */
  private detectMultipleWriters(text: string): boolean {
    // This would analyze writing consistency in a real implementation
    // For now, use simple heuristics
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 3) return false;

    // Check for significant style differences between lines
    const styles = lines.map(line => this.determineHandwritingStyle(line));
    const uniqueStyles = new Set(styles);

    return uniqueStyles.size > 1;
  }

  /**
   * Analyze text for handwriting vs printed characteristics
   */
  private analyzeTextForHandwriting(text: string): {
    handwritingPercentage: number;
    printedTextPercentage: number;
    confidence: number;
  } {
    let handwritingIndicators = 0;
    let printedIndicators = 0;

    // Check for handwriting indicators
    if (this.detectConnectedLetters(text)) handwritingIndicators++;
    if (this.detectInconsistentSpacing(text)) handwritingIndicators++;
    if (this.detectIrregularBaseline(text)) handwritingIndicators++;
    if (this.detectVariableLetterSize(text)) handwritingIndicators++;

    // Check for printed text indicators
    if (text === text.toUpperCase() || text === text.toLowerCase()) printedIndicators++;
    if (/^\s*[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/.test(text)) printedIndicators++;

    const totalIndicators = handwritingIndicators + printedIndicators;
    if (totalIndicators === 0) {
      return { handwritingPercentage: 0.5, printedTextPercentage: 0.5, confidence: 0.1 };
    }

    const handwritingPercentage = handwritingIndicators / totalIndicators;
    const printedTextPercentage = printedIndicators / totalIndicators;
    const confidence = Math.min(0.9, totalIndicators / 4); // Max confidence of 0.9

    return { handwritingPercentage, printedTextPercentage, confidence };
  }

  /**
   * Analyze image quality
   */
  private analyzeImageQuality(imageBuffer: Buffer): 'poor' | 'fair' | 'good' | 'excellent' {
    // In a real implementation, this would analyze image sharpness, resolution, etc.
    // For now, use file size as a rough indicator
    const sizeKB = imageBuffer.length / 1024;

    if (sizeKB > 500) return 'excellent';
    if (sizeKB > 200) return 'good';
    if (sizeKB > 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate overall confidence from text blocks
   */
  private calculateOverallConfidence(textBlocks: HandwritingTextBlock[]): number {
    if (textBlocks.length === 0) return 0;

    const totalConfidence = textBlocks.reduce((sum, block) => sum + block.confidence, 0);
    return totalConfidence / textBlocks.length;
  }

  /**
   * Convert confidence score to confidence level
   */
  private getConfidenceLevel(confidence: number): HandwritingConfidence {
    if (confidence >= 0.9) return HandwritingConfidence.VERY_HIGH;
    if (confidence >= 0.7) return HandwritingConfidence.HIGH;
    if (confidence >= 0.5) return HandwritingConfidence.MEDIUM;
    if (confidence >= 0.3) return HandwritingConfidence.LOW;
    return HandwritingConfidence.VERY_LOW;
  }

  /**
   * Get supported handwriting styles
   */
  getSupportedStyles(): HandwritingStyle[] {
    return Object.values(HandwritingStyle);
  }

  /**
   * Validate image for handwriting recognition
   */
  validateImageForHandwriting(
    imageBuffer: Buffer,
    mimeType: string,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (imageBuffer.length === 0) {
      errors.push('Image buffer is empty');
    }

    if (imageBuffer.length > 10 * 1024 * 1024) {
      errors.push('Image is too large (max 10MB)');
    }

    // Check mime type
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(mimeType)) {
      errors.push(`Unsupported image format: ${mimeType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}