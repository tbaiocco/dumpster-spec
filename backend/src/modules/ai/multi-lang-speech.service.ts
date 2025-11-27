import { Injectable, Logger } from '@nestjs/common';
import { SpeechService } from './speech.service';

// Define supported languages
export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  CHINESE_SIMPLIFIED = 'zh-CN',
  CHINESE_TRADITIONAL = 'zh-TW',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  RUSSIAN = 'ru',
  ARABIC = 'ar',
  HINDI = 'hi',
  DUTCH = 'nl',
  SWEDISH = 'sv',
  NORWEGIAN = 'no',
  DANISH = 'da',
  FINNISH = 'fi',
  POLISH = 'pl',
  TURKISH = 'tr',
}

// Define language detection confidence levels
export enum ConfidenceLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

// Define transcription result
interface MultiLanguageTranscriptionResult {
  text: string;
  detectedLanguage: SupportedLanguage;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  alternativeLanguages: Array<{
    language: SupportedLanguage;
    confidence: number;
    text?: string;
  }>;
  processingTime: number;
  audioMetadata: {
    duration: number;
    sampleRate?: number;
    channels?: number;
    format: string;
  };
}

// Define language detection result
interface LanguageDetectionResult {
  primaryLanguage: SupportedLanguage;
  confidence: number;
  alternativeLanguages: Array<{
    language: SupportedLanguage;
    confidence: number;
  }>;
}

@Injectable()
export class MultiLanguageSpeechService {
  private readonly logger = new Logger(MultiLanguageSpeechService.name);

  // Language priority based on common usage
  private readonly languagePriority: SupportedLanguage[] = [
    SupportedLanguage.ENGLISH,
    SupportedLanguage.SPANISH,
    SupportedLanguage.CHINESE_SIMPLIFIED,
    SupportedLanguage.FRENCH,
    SupportedLanguage.GERMAN,
    SupportedLanguage.JAPANESE,
    SupportedLanguage.PORTUGUESE,
    SupportedLanguage.RUSSIAN,
    SupportedLanguage.ITALIAN,
    SupportedLanguage.KOREAN,
  ];

  constructor(private readonly speechService: SpeechService) {}

  /**
   * Transcribe audio with automatic language detection
   */
  async transcribeWithLanguageDetection(
    audioBuffer: Buffer,
    audioFormat: string,
    options?: {
      candidateLanguages?: SupportedLanguage[];
      enableAlternatives?: boolean;
      maxAlternatives?: number;
    },
  ): Promise<MultiLanguageTranscriptionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting multi-language transcription for ${audioFormat} audio`,
      );

      // Get audio metadata
      const audioMetadata = await this.extractAudioMetadata(
        audioBuffer,
        audioFormat,
      );

      // Detect language first
      const languageDetection = await this.detectLanguage(
        audioBuffer,
        audioFormat,
        options?.candidateLanguages,
      );

      // Transcribe with detected language
      const transcription = await this.speechService.transcribeAudio({
        audioBuffer,
        mimeType: audioFormat,
        languageCode: languageDetection.primaryLanguage,
      });

      // Get alternatives if requested
      const alternatives: MultiLanguageTranscriptionResult['alternativeLanguages'] =
        [];
      if (options?.enableAlternatives && options?.maxAlternatives) {
        const altCount = Math.min(
          options.maxAlternatives,
          languageDetection.alternativeLanguages.length,
        );

        for (let i = 0; i < altCount; i++) {
          const altLang = languageDetection.alternativeLanguages[i];
          try {
            const altTranscription = await this.speechService.transcribeAudio({
              audioBuffer,
              mimeType: audioFormat,
              languageCode: altLang.language,
            });
            alternatives.push({
              language: altLang.language,
              confidence: altLang.confidence,
              text: altTranscription.transcript,
            });
          } catch (error) {
            this.logger.warn(
              `Failed to transcribe alternative language ${altLang.language}: ${error.message}`,
            );
            alternatives.push({
              language: altLang.language,
              confidence: altLang.confidence,
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;

      const result: MultiLanguageTranscriptionResult = {
        text: transcription.transcript,
        detectedLanguage: languageDetection.primaryLanguage,
        confidence: languageDetection.confidence,
        confidenceLevel: this.getConfidenceLevel(languageDetection.confidence),
        alternativeLanguages: alternatives,
        processingTime,
        audioMetadata,
      };

      this.logger.log(
        `Transcription completed in ${processingTime}ms. Language: ${languageDetection.primaryLanguage}, Confidence: ${languageDetection.confidence}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Multi-language transcription failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Multi-language transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio with specific language
   */
  async transcribeWithLanguage(
    audioBuffer: Buffer,
    audioFormat: string,
    language: SupportedLanguage,
  ): Promise<MultiLanguageTranscriptionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Transcribing with specific language: ${language}`);

      const audioMetadata = await this.extractAudioMetadata(
        audioBuffer,
        audioFormat,
      );

      const transcription = await this.speechService.transcribeAudio({
        audioBuffer,
        mimeType: audioFormat,
        languageCode: language,
      });

      const processingTime = Date.now() - startTime;

      return {
        text: transcription.transcript,
        detectedLanguage: language,
        confidence: 1.0, // Max confidence since language is specified
        confidenceLevel: ConfidenceLevel.VERY_HIGH,
        alternativeLanguages: [],
        processingTime,
        audioMetadata,
      };
    } catch (error) {
      this.logger.error(
        `Language-specific transcription failed: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Language-specific transcription failed: ${error.message}`,
      );
    }
  }

  /**
   * Detect language from audio sample
   */
  async detectLanguage(
    audioBuffer: Buffer,
    audioFormat: string,
    candidateLanguages?: SupportedLanguage[],
  ): Promise<LanguageDetectionResult> {
    try {
      this.logger.log('Detecting language from audio');

      // Use candidate languages or default priority list
      const languages = candidateLanguages || this.languagePriority.slice(0, 5);

      // Try transcription with each candidate language and score results
      const results: Array<{
        language: SupportedLanguage;
        confidence: number;
        textLength: number;
      }> = [];

      // Use a shorter sample for language detection to speed up the process
      const sampleBuffer = this.extractAudioSample(
        audioBuffer,
        audioFormat,
        10000,
      ); // 10 second sample

      for (const language of languages) {
        try {
          const transcription = await this.speechService.transcribeAudio({
            audioBuffer: sampleBuffer,
            mimeType: audioFormat,
            languageCode: language,
          });

          // Calculate confidence based on transcription quality
          const confidence = this.calculateLanguageConfidence(
            transcription.transcript,
            language,
            transcription.confidence,
          );

          results.push({
            language,
            confidence,
            textLength: transcription.transcript.length,
          });
        } catch (error) {
          this.logger.warn(
            `Language detection failed for ${language}: ${error.message}`,
          );
          results.push({
            language,
            confidence: 0,
            textLength: 0,
          });
        }
      }

      // Sort by confidence
      results.sort((a, b) => b.confidence - a.confidence);

      // Return the best match and alternatives
      const primaryResult = results[0];
      const alternatives = results.slice(1, 4).map((r) => ({
        language: r.language,
        confidence: r.confidence,
      }));

      return {
        primaryLanguage: primaryResult.language,
        confidence: primaryResult.confidence,
        alternativeLanguages: alternatives,
      };
    } catch (error) {
      this.logger.error(
        `Language detection failed: ${error.message}`,
        error.stack,
      );
      // Return default to English
      return {
        primaryLanguage: SupportedLanguage.ENGLISH,
        confidence: 0.1,
        alternativeLanguages: [],
      };
    }
  }

  /**
   * Extract audio sample for faster language detection
   */
  private extractAudioSample(
    audioBuffer: Buffer,
    audioFormat: string,
    maxDurationMs: number,
  ): Buffer {
    // For simplicity, just return the beginning of the buffer
    // In a real implementation, this would properly extract based on audio format
    const maxBytes = Math.min(
      audioBuffer.length,
      Math.floor(audioBuffer.length * 0.3),
    );
    return audioBuffer.subarray(0, maxBytes);
  }

  /**
   * Calculate language confidence based on transcription results
   */
  private calculateLanguageConfidence(
    text: string,
    language: SupportedLanguage,
    transcriptionConfidence: number,
  ): number {
    let confidence = transcriptionConfidence;

    // Boost confidence based on text characteristics
    if (text.length > 10) {
      confidence += 0.1; // Longer text usually means better transcription
    }

    // Language-specific character patterns
    confidence += this.analyzeLanguageCharacteristics(text, language);

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Analyze text characteristics for specific languages
   */
  private analyzeLanguageCharacteristics(
    text: string,
    language: SupportedLanguage,
  ): number {
    let boost = 0;

    switch (language) {
      case SupportedLanguage.CHINESE_SIMPLIFIED:
      case SupportedLanguage.CHINESE_TRADITIONAL:
        // Check for Chinese characters
        if (/[\u4e00-\u9fff]/.test(text)) {
          boost += 0.3;
        }
        break;

      case SupportedLanguage.JAPANESE:
        // Check for Japanese characters (Hiragana, Katakana, Kanji)
        if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(text)) {
          boost += 0.3;
        }
        break;

      case SupportedLanguage.KOREAN:
        // Check for Korean characters
        if (/[\uac00-\ud7af]/.test(text)) {
          boost += 0.3;
        }
        break;

      case SupportedLanguage.ARABIC:
        // Check for Arabic characters
        if (/[\u0600-\u06ff]/.test(text)) {
          boost += 0.3;
        }
        break;

      case SupportedLanguage.RUSSIAN:
        // Check for Cyrillic characters
        if (/[\u0400-\u04ff]/.test(text)) {
          boost += 0.3;
        }
        break;

      case SupportedLanguage.ENGLISH: {
        // English specific patterns (common words)
        const englishWords = [
          'the',
          'and',
          'is',
          'in',
          'to',
          'of',
          'a',
          'that',
        ];
        const foundWords = englishWords.filter(
          (word) =>
            text.toLowerCase().includes(` ${word} `) ||
            text.toLowerCase().startsWith(`${word} `),
        );
        boost += foundWords.length * 0.05;
        break;
      }

      default:
        // For other languages, check for Latin script with language-specific patterns
        if (/^[a-zA-Z\s\p{P}]+$/u.test(text)) {
          boost += 0.1;
        }
        break;
    }

    return boost;
  }

  /**
   * Convert confidence score to confidence level
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.9) return ConfidenceLevel.VERY_HIGH;
    if (confidence >= 0.7) return ConfidenceLevel.HIGH;
    if (confidence >= 0.5) return ConfidenceLevel.MEDIUM;
    if (confidence >= 0.3) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  /**
   * Extract audio metadata (simplified version)
   */
  private async extractAudioMetadata(
    audioBuffer: Buffer,
    audioFormat: string,
  ): Promise<MultiLanguageTranscriptionResult['audioMetadata']> {
    // Basic metadata extraction - could be enhanced with proper audio analysis
    return {
      duration: this.estimateAudioDuration(audioBuffer, audioFormat),
      format: audioFormat,
    };
  }

  /**
   * Estimate audio duration based on buffer size and format
   */
  private estimateAudioDuration(
    audioBuffer: Buffer,
    audioFormat: string,
  ): number {
    // Very rough estimation based on common formats
    // In a real implementation, this would parse audio headers
    const bytesPerSecond = audioFormat.includes('mp3')
      ? 16000
      : audioFormat.includes('wav')
        ? 176400
        : audioFormat.includes('ogg')
          ? 20000
          : 16000;

    return Math.round((audioBuffer.length / bytesPerSecond) * 1000); // Duration in ms
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Object.values(SupportedLanguage);
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return Object.values(SupportedLanguage).includes(
      language as SupportedLanguage,
    );
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      [SupportedLanguage.ENGLISH]: 'English',
      [SupportedLanguage.SPANISH]: 'Spanish',
      [SupportedLanguage.FRENCH]: 'French',
      [SupportedLanguage.GERMAN]: 'German',
      [SupportedLanguage.ITALIAN]: 'Italian',
      [SupportedLanguage.PORTUGUESE]: 'Portuguese',
      [SupportedLanguage.CHINESE_SIMPLIFIED]: 'Chinese (Simplified)',
      [SupportedLanguage.CHINESE_TRADITIONAL]: 'Chinese (Traditional)',
      [SupportedLanguage.JAPANESE]: 'Japanese',
      [SupportedLanguage.KOREAN]: 'Korean',
      [SupportedLanguage.RUSSIAN]: 'Russian',
      [SupportedLanguage.ARABIC]: 'Arabic',
      [SupportedLanguage.HINDI]: 'Hindi',
      [SupportedLanguage.DUTCH]: 'Dutch',
      [SupportedLanguage.SWEDISH]: 'Swedish',
      [SupportedLanguage.NORWEGIAN]: 'Norwegian',
      [SupportedLanguage.DANISH]: 'Danish',
      [SupportedLanguage.FINNISH]: 'Finnish',
      [SupportedLanguage.POLISH]: 'Polish',
      [SupportedLanguage.TURKISH]: 'Turkish',
    };

    return names[languageCode] || languageCode;
  }
}
