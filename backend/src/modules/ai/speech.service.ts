import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SpeechTranscriptionRequest {
  audioBuffer: Buffer;
  mimeType: string;
  languageCode?: string;
  enableAutomaticPunctuation?: boolean;
  enableWordTimeOffsets?: boolean;
  maxAlternatives?: number;
}

export interface SpeechTranscriptionResponse {
  transcript: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  wordTimings?: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
  detectedLanguage?: string;
}

export interface GoogleSpeechRequest {
  config: {
    encoding: string;
    sampleRateHertz?: number;
    languageCode: string;
    enableAutomaticPunctuation?: boolean;
    enableWordTimeOffsets?: boolean;
    maxAlternatives?: number;
    model?: string;
    useEnhanced?: boolean;
  };
  audio: {
    content: string; // base64 encoded
  };
}

export interface GoogleSpeechResponse {
  results: Array<{
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words?: Array<{
        word: string;
        startTime: string;
        endTime: string;
      }>;
    }>;
    languageCode?: string;
  }>;
}

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_CLOUD_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('Google Cloud API key not configured');
    }
  }

  async transcribeAudio(
    request: SpeechTranscriptionRequest,
  ): Promise<SpeechTranscriptionResponse> {
    this.logger.log(
      `Transcribing audio: ${request.mimeType}, ${request.audioBuffer.length} bytes`,
    );

    try {
      // Validate audio format
      const encoding = this.getAudioEncoding(request.mimeType);
      if (!encoding) {
        throw new Error(`Unsupported audio format: ${request.mimeType}`);
      }

      // Convert audio buffer to base64
      const audioContent = request.audioBuffer.toString('base64');

      // Prepare the request
      const googleRequest: GoogleSpeechRequest = {
        config: {
          encoding,
          languageCode: request.languageCode || 'en-US',
          enableAutomaticPunctuation:
            request.enableAutomaticPunctuation ?? true,
          enableWordTimeOffsets: request.enableWordTimeOffsets ?? false,
          maxAlternatives: request.maxAlternatives || 1,
          model: 'latest_long', // Good for voice messages
          useEnhanced: true,
        },
        audio: {
          content: audioContent,
        },
      };

      const response = await this.callGoogleSpeechAPI(googleRequest);
      return this.parseTranscriptionResponse(response);
    } catch (error) {
      this.logger.error('Error transcribing audio:', error);
      throw new Error(
        `Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async transcribeWithLanguageDetection(
    audioBuffer: Buffer,
    mimeType: string,
  ): Promise<SpeechTranscriptionResponse> {
    this.logger.log('Transcribing audio with language detection');

    // Try common languages in order of preference
    const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'];

    let bestResult: SpeechTranscriptionResponse | null = null;
    let highestConfidence = 0;

    for (const languageCode of languages) {
      try {
        const result = await this.transcribeAudio({
          audioBuffer,
          mimeType,
          languageCode,
          enableAutomaticPunctuation: true,
          maxAlternatives: 1,
        });

        if (result.confidence > highestConfidence) {
          highestConfidence = result.confidence;
          bestResult = result;
          bestResult.detectedLanguage = languageCode;
        }

        // If we get high confidence, we can stop
        if (result.confidence > 0.8) {
          break;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to transcribe with language ${languageCode}:`,
          error,
        );
        continue;
      }
    }

    if (!bestResult) {
      throw new Error('Failed to transcribe audio in any supported language');
    }

    this.logger.log(
      `Best transcription with confidence ${bestResult.confidence} in ${bestResult.detectedLanguage}`,
    );
    return bestResult;
  }

  isAudioValid(audioBuffer: Buffer, mimeType: string): boolean {
    try {
      // Basic validation
      if (audioBuffer.length === 0) {
        return false;
      }

      // Check if mime type is supported
      const encoding = this.getAudioEncoding(mimeType);
      if (!encoding) {
        return false;
      }

      // Check file size (Google Cloud has limits)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (audioBuffer.length > maxSizeBytes) {
        this.logger.warn(`Audio file too large: ${audioBuffer.length} bytes`);
        return false;
      }

      // Basic format validation by checking headers
      return this.validateAudioHeaders(audioBuffer, mimeType);
    } catch (error) {
      this.logger.error('Error validating audio:', error);
      return false;
    }
  }

  private async callGoogleSpeechAPI(
    request: GoogleSpeechRequest,
  ): Promise<GoogleSpeechResponse> {
    if (!this.apiKey) {
      throw new Error('Google Cloud API key not configured');
    }

    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Speech API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<GoogleSpeechResponse>;
  }

  private parseTranscriptionResponse(
    response: GoogleSpeechResponse,
  ): SpeechTranscriptionResponse {
    if (!response.results || response.results.length === 0) {
      return {
        transcript: '',
        confidence: 0,
        alternatives: [],
      };
    }

    const primaryResult = response.results[0];
    const primaryAlternative = primaryResult.alternatives[0];

    if (!primaryAlternative) {
      return {
        transcript: '',
        confidence: 0,
        alternatives: [],
      };
    }

    const result: SpeechTranscriptionResponse = {
      transcript: primaryAlternative.transcript,
      confidence: primaryAlternative.confidence || 0,
      alternatives: primaryResult.alternatives.slice(1).map((alt) => ({
        transcript: alt.transcript,
        confidence: alt.confidence || 0,
      })),
    };

    // Add word timings if available
    if (primaryAlternative.words) {
      result.wordTimings = primaryAlternative.words.map((word) => ({
        word: word.word,
        startTime: this.parseGoogleDuration(word.startTime),
        endTime: this.parseGoogleDuration(word.endTime),
      }));
    }

    // Add detected language if available
    if (primaryResult.languageCode) {
      result.detectedLanguage = primaryResult.languageCode;
    }

    return result;
  }

  private getAudioEncoding(mimeType: string): string | null {
    const mimeToEncoding: Record<string, string> = {
      'audio/wav': 'LINEAR16',
      'audio/x-wav': 'LINEAR16',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/mp4': 'MP3',
      'audio/m4a': 'MP3',
      'audio/x-m4a': 'MP3',
      'audio/ogg': 'OGG_OPUS',
      'audio/opus': 'OGG_OPUS',
      'audio/webm': 'WEBM_OPUS',
      'audio/flac': 'FLAC',
      'audio/x-flac': 'FLAC',
    };

    return mimeToEncoding[mimeType.toLowerCase()] || null;
  }

  private validateAudioHeaders(audioBuffer: Buffer, mimeType: string): boolean {
    if (audioBuffer.length < 4) {
      return false;
    }

    const header = audioBuffer.subarray(0, 4);

    switch (mimeType.toLowerCase()) {
      case 'audio/wav':
      case 'audio/x-wav':
        // WAV files start with "RIFF"
        return header.toString('ascii') === 'RIFF';

      case 'audio/mpeg':
      case 'audio/mp3':
        // MP3 files start with ID3 tag or sync frame
        return (
          header.toString('ascii').startsWith('ID3') ||
          (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
        );

      case 'audio/ogg':
        // OGG files start with "OggS"
        return header.toString('ascii') === 'OggS';

      case 'audio/flac':
      case 'audio/x-flac':
        // FLAC files start with "fLaC"
        return header.toString('ascii') === 'fLaC';

      default:
        // For other formats, assume valid
        return true;
    }
  }

  private parseGoogleDuration(duration: string): number {
    // Google returns duration in format like "1.500s"
    if (!duration) return 0;

    const regex = /^(\d+(?:\.\d+)?)s?$/;
    const match = regex.exec(duration);
    if (!match) return 0;

    return Number.parseFloat(match[1]);
  }

  getEstimatedCost(audioBuffer: Buffer): number {
    // Google Cloud Speech-to-Text pricing (as of 2024)
    // Standard model: $0.006 per 15 seconds
    // Enhanced model: $0.009 per 15 seconds

    const durationMinutes = this.estimateAudioDuration(audioBuffer);
    const durationSeconds = durationMinutes * 60;
    const billing15SecondBlocks = Math.ceil(durationSeconds / 15);

    // Using enhanced model pricing
    const costPer15Seconds = 0.009;
    return billing15SecondBlocks * costPer15Seconds;
  }

  private estimateAudioDuration(audioBuffer: Buffer): number {
    // Rough estimation based on file size
    // This is approximate - real duration would require parsing the audio file
    const avgBitrate = 64000; // 64 kbps average for voice
    const bytesPerSecond = avgBitrate / 8;
    const estimatedSeconds = audioBuffer.length / bytesPerSecond;
    return estimatedSeconds / 60; // Convert to minutes
  }
}
