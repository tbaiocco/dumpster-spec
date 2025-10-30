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
  private readonly apiKey: string;
  private readonly keyFilePath: string;
  private readonly projectId: string;
  private readonly apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';
  private readonly useServiceAccount: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_CLOUD_API_KEY') || '';
    const keyFilePathRaw = this.configService.get<string>('GOOGLE_CLOUD_KEY_FILE') || '';
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || '';
    
    // Resolve key file path to absolute path
    if (keyFilePathRaw) {
      if (keyFilePathRaw.startsWith('/')) {
        // Already absolute path
        this.keyFilePath = keyFilePathRaw;
      } else {
        // Relative path - resolve from backend directory
        const { resolve } = require('node:path');
        this.keyFilePath = resolve(process.cwd(), keyFilePathRaw);
      }
    } else {
      this.keyFilePath = '';
    }
    
    // Prefer service account key file over API key
    this.useServiceAccount = !!this.keyFilePath && !!this.projectId;

    if (!this.useServiceAccount && !this.apiKey) {
      this.logger.warn('Google Cloud API key or service account key file not configured');
    } else if (this.useServiceAccount) {
      this.logger.log(`Using Google Cloud service account authentication with key file: ${this.keyFilePath}`);
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
      this.logger.debug(`Audio buffer size: ${request.audioBuffer.length} bytes`);
      this.logger.debug(`Base64 audio content length: ${audioContent.length} characters`);

      // Prepare the request with sample rate for Opus
      const languageCode = request.languageCode || 'en-US';
      
      this.logger.debug(`Configuring Speech-to-Text with language: ${languageCode}, encoding: ${encoding}`);
      
      const config: any = {
        encoding,
        languageCode,
        enableAutomaticPunctuation: true, // Always enable for better parsing
        enableWordTimeOffsets: request.enableWordTimeOffsets ?? true, // Enable for debugging
        maxAlternatives: 3, // Optimal number of alternatives
        useEnhanced: true, // Always use enhanced model
        model: 'phone_call', // Optimized for mobile voice messages (WhatsApp, Telegram)
      };

      // Audio format specific configurations
      if (encoding === 'OGG_OPUS') {
        config.sampleRateHertz = 48000; // Standard Opus sample rate
        this.logger.debug('Using OGG_OPUS encoding with 48kHz sample rate');
      } else if (encoding === 'MP3') {
        config.sampleRateHertz = 16000; // Standard MP3 sample rate for speech
        this.logger.debug('Using MP3 encoding with 16kHz sample rate');
      }
      
      // Enhanced language configuration for better recognition
      // Note: phone_call model doesn't support alternativeLanguageCodes
      if (config.model !== 'phone_call') {
        if (languageCode.startsWith('pt')) {
          // Use both Portuguese variants for better recognition
          config.alternativeLanguageCodes = ['pt-BR', 'pt-PT'];
          this.logger.debug('Added Portuguese language alternatives');
        } else if (languageCode.startsWith('es')) {
          // Spanish variants
          config.alternativeLanguageCodes = ['es-ES', 'es-MX', 'es-AR'];
          this.logger.debug('Added Spanish language alternatives');
        } else if (languageCode.startsWith('en')) {
          // English variants
          config.alternativeLanguageCodes = ['en-US', 'en-GB', 'en-AU'];
          this.logger.debug('Added English language alternatives');
        }
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
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    let url = this.apiUrl;

    if (this.useServiceAccount) {
      // Use service account authentication
      const accessToken = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (this.apiKey) {
      // Use API key authentication
      url = `${this.apiUrl}?key=${this.apiKey}`;
    } else {
      throw new Error('Google Cloud API key or service account not configured');
    }

    this.logger.debug('Calling Google Speech API with config:', {
      url,
      encoding: request.config.encoding,
      languageCode: request.config.languageCode,
      sampleRateHertz: request.config.sampleRateHertz,
      audioSize: request.audio.content.length
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
        headers: { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined }
      });
      throw new Error(`Google Speech API error: ${response.status} ${error}`);
    }

    const result = await response.json() as GoogleSpeechResponse;
    this.logger.debug('Google Speech API success, results count:', result.results?.length || 0);
    
    return result;
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { GoogleAuth } = require('google-auth-library');
      
      this.logger.debug(`Attempting to authenticate with key file: ${this.keyFilePath}`);
      this.logger.debug(`Project ID: ${this.projectId}`);
      
      // Check if key file exists and is readable
      if (!this.keyFilePath) {
        throw new Error('GOOGLE_CLOUD_KEY_FILE environment variable not set');
      }
      
      // Create Google Auth client
      const auth = new GoogleAuth({
        keyFile: this.keyFilePath,
        projectId: this.projectId,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      this.logger.debug('Google Auth client created, requesting access token...');
      
      // Get access token
      const accessToken = await auth.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token returned from Google Cloud');
      }
      
      this.logger.debug('Access token obtained successfully');
      return accessToken;
    } catch (error) {
      this.logger.error('Error getting access token:', {
        error: error.message,
        keyFilePath: this.keyFilePath,
        projectId: this.projectId,
        stack: error.stack
      });
      throw new Error(`Failed to authenticate with Google Cloud service account: ${error.message}`);
    }
  }

  private parseTranscriptionResponse(
    response: GoogleSpeechResponse,
  ): SpeechTranscriptionResponse {
    this.logger.debug('Google Speech API response:', JSON.stringify(response, null, 2));
    
    if (!response.results || response.results.length === 0) {
      this.logger.warn('No results returned from Google Speech API');
      return {
        transcript: '',
        confidence: 0,
        alternatives: [],
      };
    }

    // Log all alternatives to help debug Portuguese recognition
    this.logger.debug('All transcription alternatives:', 
      response.results.map((result, i) => ({
        resultIndex: i,
        alternatives: result.alternatives?.map((alt, j) => ({
          index: j,
          transcript: alt.transcript,
          confidence: alt.confidence
        }))
      }))
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
        const hasTemporalKeyword = temporalKeywords.some(keyword => 
          transcript.includes(keyword)
        );
        
        if (hasTemporalKeyword && alternative.confidence > 0.5) {
          this.logger.debug(`Selected alternative with temporal keyword: "${alternative.transcript}" (confidence: ${alternative.confidence})`);
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
