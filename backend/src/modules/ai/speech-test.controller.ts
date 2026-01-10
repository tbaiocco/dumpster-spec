import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';

@Controller('api/speech-test')
export class SpeechTestController {
  private readonly logger = new Logger(SpeechTestController.name);

  constructor(private readonly speechService: SpeechService) {}

  /**
   * Detect MIME type from file extension or override generic octet-stream
   */
  private detectMimeType(file: Express.Multer.File): string {
    // If a proper MIME type is already set, use it
    if (file.mimetype && file.mimetype !== 'application/octet-stream') {
      return file.mimetype;
    }

    // Detect from file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      ogg: 'audio/ogg',
      opus: 'audio/opus',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/m4a',
      flac: 'audio/flac',
      webm: 'audio/webm',
    };

    return mimeTypeMap[extension || ''] || file.mimetype;
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async testTranscription(
    @UploadedFile() file: Express.Multer.File,
    @Query('language') language?: string,
    @Query('enablePunctuation') enablePunctuation?: string,
    @Query('maxAlternatives') maxAlternatives?: string,
    @Query('autoDetect') autoDetect?: string,
    @Query('mimeType') mimeTypeOverride?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    const mimeType = mimeTypeOverride || this.detectMimeType(file);

    this.logger.log(
      `Testing transcription for file: ${file.originalname} (${mimeType}, ${file.size} bytes)`,
    );

    try {
      const languageCode = language || 'pt-BR';
      const shouldAutoDetect = autoDetect === 'true';

      let result;

      if (shouldAutoDetect) {
        this.logger.log('Using language auto-detection');
        result = await this.speechService.transcribeWithLanguageDetection(
          file.buffer,
          mimeType,
        );
      } else {
        this.logger.log(`Using language: ${languageCode}`);
        result = await this.speechService.transcribeAudio({
          audioBuffer: file.buffer,
          mimeType: mimeType,
          languageCode,
          enableAutomaticPunctuation: enablePunctuation !== 'false',
          enableWordTimeOffsets: true,
          maxAlternatives: maxAlternatives ? parseInt(maxAlternatives, 10) : 5,
        });
      }

      // Format response with detailed information
      return {
        success: true,
        file: {
          name: file.originalname,
          size: file.size,
          mimeType: mimeType,
          originalMimeType: file.mimetype,
        },
        config: {
          language: languageCode,
          autoDetect: shouldAutoDetect,
          enablePunctuation: enablePunctuation !== 'false',
          maxAlternatives: maxAlternatives ? parseInt(maxAlternatives, 10) : 5,
        },
        result: {
          transcript: result.transcript,
          confidence: result.confidence,
          detectedLanguage: result.detectedLanguage,
          alternativeCount: result.alternatives?.length || 0,
          alternatives: result.alternatives?.map((alt, idx) => ({
            index: idx + 1,
            transcript: alt.transcript,
            confidence: alt.confidence,
          })),
          wordTimings: result.wordTimings?.length
            ? {
                count: result.wordTimings.length,
                first: result.wordTimings[0],
                last: result.wordTimings[result.wordTimings.length - 1],
                sample: result.wordTimings.slice(0, 5),
              }
            : null,
        },
        estimatedCost: this.speechService.getEstimatedCost(file.buffer),
      };
    } catch (error) {
      this.logger.error('Transcription test failed:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack:
            error instanceof Error && process.env.NODE_ENV !== 'production'
              ? error.stack
              : undefined,
        },
        file: {
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        },
      };
    }
  }

  @Post('transcribe-all-languages')
  @UseInterceptors(FileInterceptor('audio'))
  async testAllLanguages(
    @UploadedFile() file: Express.Multer.File,
    @Query('mimeType') mimeTypeOverride?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    const mimeType = mimeTypeOverride || this.detectMimeType(file);

    this.logger.log(
      `Testing transcription with all languages for: ${file.originalname} (${mimeType})`,
    );

    const languages = [
      'pt-BR',
      'pt-PT',
      'en-US',
      'en-GB',
      'es-ES',
      'es-US',
      'fr-FR',
      'de-DE',
      'it-IT',
    ];

    const results: Array<{
      language: string;
      success: boolean;
      transcript?: string;
      confidence?: number;
      hasContent?: boolean;
      error?: string;
    }> = [];

    for (const languageCode of languages) {
      try {
        this.logger.log(`Testing with language: ${languageCode}`);
        
        const result = await this.speechService.transcribeAudio({
          audioBuffer: file.buffer,
          mimeType: mimeType,
          languageCode,
          enableAutomaticPunctuation: true,
          maxAlternatives: 1,
        });

        results.push({
          language: languageCode,
          success: true,
          transcript: result.transcript,
          confidence: result.confidence,
          hasContent: result.transcript.length > 0,
        });
      } catch (error) {
        this.logger.error(`Failed with language ${languageCode}:`, error);
        results.push({
          language: languageCode,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Sort by confidence
    const successfulResults = results
      .filter((r) => r.success && r.hasContent)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    return {
      success: true,
      file: {
        name: file.originalname,
        size: file.size,
        mimeType: mimeType,
        originalMimeType: file.mimetype,
      },
      results,
      bestResult: successfulResults[0] || null,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        withContent: successfulResults.length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }
}
