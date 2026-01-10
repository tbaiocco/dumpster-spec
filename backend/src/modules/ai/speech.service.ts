import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';

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
    alternativeLanguageCodes?: string[];
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
  private readonly apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';

  constructor(
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
  ) {
    if (!this.googleAuthService.isAuthenticated()) {
      this.logger.warn(
        'Google Cloud service account not configured for Speech-to-Text',
      );
    } else {
      this.logger.log(
        `Using Google Cloud service account authentication for project: ${this.googleAuthService.getProjectId()}`,
      );
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

      // Debug: Log base64 audio content
      this.logger.debug(
        `Audio buffer size: ${request.audioBuffer.length} bytes`,
      );
      this.logger.debug(
        `Base64 audio content length: ${audioContent.length} characters`,
      );

      // Prepare the request with sample rate for Opus
      const languageCode = request.languageCode || 'en-US';

      this.logger.debug(
        `Configuring Speech-to-Text with language: ${languageCode}, encoding: ${encoding}`,
      );

      // Use phone_call model for WhatsApp/Telegram voice messages
      // Testing showed this gives best accuracy for voice messages at 16kHz
      const config: any = {
        encoding,
        languageCode,
        enableAutomaticPunctuation: request.enableAutomaticPunctuation ?? true,
        enableWordTimeOffsets: request.enableWordTimeOffsets ?? false, // Disable by default for speed
        maxAlternatives: request.maxAlternatives ?? 3,
        useEnhanced: true, // Enhanced model for better accuracy
        model: 'phone_call', // Optimal for voice messages (tested)
      };

      // Audio format specific configurations
      // Google requires explicit sample rates for all encodings
      if (encoding === 'OGG_OPUS') {
        // Opus in WhatsApp/Telegram voice messages typically uses 16kHz
        // Can also be 48000 for higher quality recordings
        config.sampleRateHertz = 16000;
        this.logger.debug('Using OGG_OPUS encoding with 16kHz sample rate');
      } else if (encoding === 'MP3') {
        // Standard MP3 sample rate for voice
        config.sampleRateHertz = 16000;
        this.logger.debug('Using MP3 encoding with 16kHz sample rate');
      } else if (encoding === 'LINEAR16') {
        config.sampleRateHertz = 16000;
        this.logger.debug('Using LINEAR16 encoding with 16kHz sample rate');
      } else if (encoding === 'FLAC' || encoding === 'WEBM_OPUS') {
        // FLAC and WebM can vary, use 16kHz as default
        config.sampleRateHertz = 16000;
        this.logger.debug(`Using ${encoding} encoding with 16kHz sample rate`);
      }

      // Add alternative language codes for better recognition
      // This helps when the exact dialect is uncertain
      // Note: phone_call model does NOT support alternativeLanguageCodes
      if (config.model !== 'phone_call') {
        const alternativeLanguageCodes: string[] = [];
        
        if (languageCode.startsWith('pt')) {
          alternativeLanguageCodes.push('pt-BR', 'pt-PT');
          this.logger.debug('Added Portuguese language alternatives');
        } else if (languageCode.startsWith('es')) {
          alternativeLanguageCodes.push('es-ES', 'es-US', 'es-MX');
          this.logger.debug('Added Spanish language alternatives');
        } else if (languageCode.startsWith('en')) {
          alternativeLanguageCodes.push('en-US', 'en-GB');
          this.logger.debug('Added English language alternatives');
        }

        if (alternativeLanguageCodes.length > 0) {
          config.alternativeLanguageCodes = alternativeLanguageCodes;
        }
      } else {
        this.logger.debug('Skipping alternative languages (not supported by phone_call model)');
      }

      const googleRequest: GoogleSpeechRequest = {
        config,
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
    const languages = ['pt-BR', 'en-US', 'es-ES', 'de-DE', 'fr-FR', 'it-IT'];

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
    if (!this.googleAuthService.isAuthenticated()) {
      throw new Error('Google Cloud service account not configured');
    }

    // Use service account authentication
    const accessToken = await this.googleAuthService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const url = this.apiUrl;

    this.logger.debug('Calling Google Speech API with config:', {
      url,
      encoding: request.config.encoding,
      languageCode: request.config.languageCode,
      sampleRateHertz: request.config.sampleRateHertz,
      audioSize: request.audio.content.length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error('Google Speech API error:', {
        status: response.status,
        error,
        url,
        headers: {
          ...headers,
          Authorization: headers.Authorization ? '[REDACTED]' : undefined,
        },
      });
      throw new Error(`Google Speech API error: ${response.status} ${error}`);
    }

    const result = (await response.json()) as GoogleSpeechResponse;
    this.logger.debug(
      'Google Speech API success, results count:',
      result.results?.length || 0,
    );
    this.logger.debug(
      'Google Speech API success, transcript:',
      result.results?.[0]?.alternatives?.[0]?.transcript || '<empty>',
    );

    return result;
  }

  private parseTranscriptionResponse(
    response: GoogleSpeechResponse,
  ): SpeechTranscriptionResponse {
    this.logger.debug(
      'Google Speech API response:',
      JSON.stringify(response, null, 2),
    );

    if (!response.results || response.results.length === 0) {
      this.logger.warn('No results returned from Google Speech API');
      return {
        transcript: '',
        confidence: 0,
        alternatives: [],
      };
    }

    // Log all alternatives to help debug Portuguese recognition
    this.logger.debug(
      'All transcription alternatives:',
      response.results.map((result, i) => ({
        resultIndex: i,
        alternatives: result.alternatives?.map((alt, j) => ({
          index: j,
          transcript: alt.transcript,
          confidence: alt.confidence,
        })),
      })),
    );

    const primaryResult = response.results[0];
    let selectedAlternative = primaryResult.alternatives[0];

    if (!selectedAlternative) {
      return {
        transcript: '',
        confidence: 0,
        alternatives: [],
      };
    }

    // Intelligent alternative selection for Portuguese temporal expressions
    if (primaryResult.alternatives && primaryResult.alternatives.length > 1) {
      const temporalKeywords = ['amanhã', 'amanha', 'hoje', 'ontem'];

      // Look for alternatives that contain temporal keywords
      for (const alternative of primaryResult.alternatives) {
        const transcript = alternative.transcript.toLowerCase();
        const hasTemporalKeyword = temporalKeywords.some((keyword) =>
          transcript.includes(keyword),
        );

        if (hasTemporalKeyword && alternative.confidence > 0.5) {
          this.logger.debug(
            `Selected alternative with temporal keyword: "${alternative.transcript}" (confidence: ${alternative.confidence})`,
          );
          selectedAlternative = alternative;
          break;
        }
      }
    }

    const primaryAlternative = selectedAlternative;

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
