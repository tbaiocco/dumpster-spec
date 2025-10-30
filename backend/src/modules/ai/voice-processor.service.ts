import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaProcessorService, MediaFile } from './media-processor.service';

export interface VoiceMessage {
  id: string;
  originalUrl: string;
  duration: number;
  format: string;
  size: number;
  transcription?: {
    text: string;
    confidence: number;
    language: string;
    words?: Array<{
      word: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
  };
  analysis?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    emotion: string;
    speechRate: 'slow' | 'normal' | 'fast';
    volume: 'low' | 'normal' | 'high';
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  metadata: {
    source: 'telegram' | 'whatsapp';
    userId: string;
    messageId: string;
    processedAt: Date;
    processingTime: number;
  };
}

export interface VoiceProcessingRequest {
  voiceUrl: string;
  source: 'telegram' | 'whatsapp';
  userId: string;
  messageId: string;
  originalName?: string;
  expectedLanguage?: string;
}

export interface VoiceProcessingResult {
  voice: VoiceMessage | null;
  success: boolean;
  error?: string;
  processingSteps: {
    download: boolean;
    validation: boolean;
    transcription: boolean;
    analysis: boolean;
  };
}

@Injectable()
export class VoiceProcessorService {
  private readonly logger = new Logger(VoiceProcessorService.name);
  
  // Voice processing constraints
  private readonly constraints = {
    maxDuration: 300, // 5 minutes in seconds
    maxFileSize: 25 * 1024 * 1024, // 25MB
    supportedFormats: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
    minDuration: 0.5, // 0.5 seconds minimum
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly mediaProcessor: MediaProcessorService
  ) {}

  async processVoiceMessage(request: VoiceProcessingRequest): Promise<VoiceProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing voice message: ${request.voiceUrl}`);

    const processingSteps = {
      download: false,
      validation: false,
      transcription: false,
      analysis: false,
    };

    try {
      // Step 1: Download and validate voice file
      const mediaResult = await this.mediaProcessor.processMedia({
        url: request.voiceUrl,
        type: 'audio',
        source: request.source,
        userId: request.userId,
        messageId: request.messageId,
        originalName: request.originalName,
      });

      if (!mediaResult.processed || !mediaResult.file) {
        throw new Error(`Media processing failed: ${mediaResult.error}`);
      }

      processingSteps.download = true;

      // Step 2: Validate voice file
      await this.validateVoiceFile(mediaResult.file);
      processingSteps.validation = true;

      // Step 3: Transcribe voice message
      const transcription = await this.transcribeVoice(mediaResult.file, request.expectedLanguage);
      processingSteps.transcription = true;

      // Step 4: Analyze voice characteristics
      const analysis = await this.analyzeVoice(mediaResult.file, transcription?.text);
      processingSteps.analysis = true;

      // Step 5: Create voice message object
      const voiceMessage: VoiceMessage = {
        id: mediaResult.file.id,
        originalUrl: request.voiceUrl,
        duration: mediaResult.file.metadata.duration || 0,
        format: mediaResult.file.metadata.format || 'unknown',
        size: mediaResult.file.size,
        transcription,
        analysis,
        metadata: {
          source: request.source,
          userId: request.userId,
          messageId: request.messageId,
          processedAt: new Date(),
          processingTime: Date.now() - startTime,
        },
      };

      this.logger.log(`Voice message processed successfully: ${voiceMessage.id}`);

      return {
        voice: voiceMessage,
        success: true,
        processingSteps,
      };

    } catch (error) {
      this.logger.error(`Voice processing failed: ${error.message}`, error.stack);

      return {
        voice: null,
        success: false,
        error: error.message,
        processingSteps,
      };
    }
  }

  async getVoiceMessage(voiceId: string): Promise<VoiceMessage | null> {
    try {
      const mediaFile = await this.mediaProcessor.getMediaFile(voiceId);
      if (!mediaFile) {
        return null;
      }

      // In a real implementation, we would retrieve stored transcription and analysis
      // For now, we'll return a basic voice message structure
      return {
        id: mediaFile.id,
        originalUrl: mediaFile.url,
        duration: mediaFile.metadata.duration || 0,
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
      this.logger.error(`Error retrieving voice message ${voiceId}:`, error);
      return null;
    }
  }

  private async validateVoiceFile(mediaFile: MediaFile): Promise<void> {
    // Check MIME type
    if (!this.constraints.supportedFormats.includes(mediaFile.mimeType)) {
      throw new Error(`Unsupported voice format: ${mediaFile.mimeType}`);
    }

    // Check file size
    if (mediaFile.size > this.constraints.maxFileSize) {
      throw new Error(`Voice file too large: ${mediaFile.size} bytes (max: ${this.constraints.maxFileSize})`);
    }

    // Check duration if available
    if (mediaFile.metadata.duration) {
      if (mediaFile.metadata.duration > this.constraints.maxDuration) {
        throw new Error(`Voice message too long: ${mediaFile.metadata.duration}s (max: ${this.constraints.maxDuration}s)`);
      }

      if (mediaFile.metadata.duration < this.constraints.minDuration) {
        throw new Error(`Voice message too short: ${mediaFile.metadata.duration}s (min: ${this.constraints.minDuration}s)`);
      }
    }

    this.logger.log(`Voice file validation passed: ${mediaFile.id}`);
  }

  private async transcribeVoice(
    mediaFile: MediaFile,
    expectedLanguage?: string
  ): Promise<VoiceMessage['transcription'] | undefined> {
    try {
      this.logger.log(`Transcribing voice file: ${mediaFile.id}`);

      // Mock transcription implementation
      // In a real implementation, this would use Google Speech-to-Text or similar service
      const mockTranscription: VoiceMessage['transcription'] = {
        text: `Mock transcription for voice message ${mediaFile.id}. This would contain the actual speech-to-text content.`,
        confidence: 0.85,
        language: expectedLanguage || 'en-US',
        words: [
          {
            word: 'Mock',
            startTime: 0,
            endTime: 0.5,
            confidence: 0.9,
          },
          {
            word: 'transcription',
            startTime: 0.5,
            endTime: 1.2,
            confidence: 0.8,
          },
        ],
      };

      this.logger.log(`Voice transcribed successfully: "${mockTranscription.text.substring(0, 50)}..."`);
      return mockTranscription;

    } catch (error) {
      this.logger.error(`Transcription error for ${mediaFile.id}:`, error);
      return undefined;
    }
  }

  private async analyzeVoice(
    mediaFile: MediaFile,
    transcriptionText?: string
  ): Promise<VoiceMessage['analysis'] | undefined> {
    try {
      this.logger.log(`Analyzing voice characteristics: ${mediaFile.id}`);

      // Basic voice analysis based on available data
      const analysis: VoiceMessage['analysis'] = {
        sentiment: this.analyzeSentiment(transcriptionText),
        emotion: this.detectEmotion(transcriptionText),
        speechRate: this.analyzeSpeechRate(mediaFile, transcriptionText),
        volume: this.analyzeVolume(mediaFile),
        quality: this.assessQuality(mediaFile),
      };

      this.logger.log(`Voice analysis completed: ${JSON.stringify(analysis)}`);
      return analysis;

    } catch (error) {
      this.logger.error(`Voice analysis error for ${mediaFile.id}:`, error);
      return undefined;
    }
  }

  private analyzeSentiment(text?: string): 'positive' | 'negative' | 'neutral' {
    if (!text) return 'neutral';

    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'sad', 'angry', 'frustrated'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectEmotion(text?: string): string {
    if (!text) return 'neutral';

    const lowerText = text.toLowerCase();

    // Simple emotion detection based on keywords and patterns
    if (lowerText.includes('!') || /[A-Z]{3,}/.test(text)) return 'excited';
    if (lowerText.includes('?') && lowerText.includes('help')) return 'confused';
    if (lowerText.includes('sorry') || lowerText.includes('apologize')) return 'apologetic';
    if (lowerText.includes('thank') || lowerText.includes('appreciate')) return 'grateful';
    if (lowerText.includes('urgent') || lowerText.includes('quickly')) return 'urgent';

    return 'neutral';
  }

  private analyzeSpeechRate(mediaFile: MediaFile, text?: string): 'slow' | 'normal' | 'fast' {
    if (!text || !mediaFile.metadata.duration) return 'normal';

    // Calculate words per minute
    const wordCount = text.split(/\s+/).length;
    const durationMinutes = mediaFile.metadata.duration / 60;
    const wordsPerMinute = wordCount / durationMinutes;

    if (wordsPerMinute < 100) return 'slow';
    if (wordsPerMinute > 200) return 'fast';
    return 'normal';
  }

  private analyzeVolume(mediaFile: MediaFile): 'low' | 'normal' | 'high' {
    // In a real implementation, this would analyze the audio waveform
    // For now, we'll return a default value
    return 'normal';
  }

  private assessQuality(mediaFile: MediaFile): 'poor' | 'fair' | 'good' | 'excellent' {
    // Quality assessment based on file size and format
    const sizePerSecond = mediaFile.size / (mediaFile.metadata.duration || 1);

    // Higher quality formats and larger file sizes typically indicate better quality
    if (mediaFile.mimeType === 'audio/wav' && sizePerSecond > 50000) return 'excellent';
    if (mediaFile.mimeType === 'audio/mpeg' && sizePerSecond > 20000) return 'good';
    if (sizePerSecond > 10000) return 'fair';
    return 'poor';
  }

  async getProcessingStats(): Promise<{
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    transcriptionAccuracy: number;
  }> {
    // In a real implementation, this would query stored statistics
    // For now, we'll return mock data
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      transcriptionAccuracy: 0,
    };
  }

  async deleteVoiceMessage(voiceId: string): Promise<boolean> {
    try {
      // Delete the underlying media file
      const result = await this.mediaProcessor.deleteMediaFile(voiceId);
      
      if (result) {
        this.logger.log(`Voice message deleted: ${voiceId}`);
        // In a real implementation, also delete transcription and analysis data
      }

      return result;

    } catch (error) {
      this.logger.error(`Error deleting voice message ${voiceId}:`, error);
      return false;
    }
  }
}