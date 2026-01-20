import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';

interface TranscriptionConfig {
  languageCode: string;
  sampleRateHertz: number;
  model: string;
  encoding: string;
}

interface TranscriptionResult {
  config: TranscriptionConfig;
  transcript: string;
  confidence: number;
  success: boolean;
  error?: string;
}

@Controller('api/speech-advanced-test')
export class SpeechAdvancedTestController {
  private readonly logger = new Logger(SpeechAdvancedTestController.name);
  private readonly apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';

  constructor(
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /**
   * Test multiple configurations to find the best one
   */
  @Post('test-all-configs')
  @UseInterceptors(FileInterceptor('audio'))
  async testAllConfigurations(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }

    this.logger.log(
      `Testing all configurations for: ${file.originalname} (${file.size} bytes)`,
    );

    // Detect MIME type
    const mimeType = this.detectMimeType(file);
    const encoding = this.getAudioEncoding(mimeType);

    if (!encoding) {
      throw new BadRequestException(`Unsupported audio format: ${mimeType}`);
    }

    // Test configurations
    const languages = ['pt-BR', 'pt-PT', 'en-US', 'es-ES'];
    const sampleRates = [8000, 16000, 24000, 48000];
    const models = ['default', 'command_and_search', 'phone_call', 'video'];

    const results: TranscriptionResult[] = [];
    const audioContent = file.buffer.toString('base64');

    // Test all combinations
    for (const languageCode of languages) {
      for (const sampleRateHertz of sampleRates) {
        for (const model of models) {
          try {
            const config: TranscriptionConfig = {
              languageCode,
              sampleRateHertz,
              model,
              encoding,
            };

            this.logger.debug(
              `Testing: ${languageCode}, ${sampleRateHertz}Hz, ${model}`,
            );

            const result = await this.transcribeWithConfig(
              audioContent,
              config,
            );

            results.push({
              config,
              transcript: result.transcript,
              confidence: result.confidence,
              success: true,
            });
          } catch (error) {
            this.logger.debug(
              `Failed: ${languageCode}, ${sampleRateHertz}Hz, ${model}`,
            );
            results.push({
              config: { languageCode, sampleRateHertz, model, encoding },
              transcript: '',
              confidence: 0,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }

    // Find best results
    const successfulResults = results
      .filter((r) => r.success && r.transcript.length > 0)
      .sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
      file: {
        name: file.originalname,
        size: file.size,
        mimeType,
        encoding,
      },
      summary: {
        totalTests: results.length,
        successful: successfulResults.length,
        failed: results.filter((r) => !r.success).length,
      },
      topResults: successfulResults.slice(0, 10),
      allResults: results,
      recommendation: this.analyzeResults(successfulResults),
    };
  }

  private async transcribeWithConfig(
    audioContent: string,
    config: TranscriptionConfig,
  ): Promise<{ transcript: string; confidence: number }> {
    const accessToken = await this.googleAuthService.getAccessToken();

    const request = {
      config: {
        encoding: config.encoding,
        sampleRateHertz: config.sampleRateHertz,
        languageCode: config.languageCode,
        model: config.model,
        enableAutomaticPunctuation: true,
        maxAlternatives: 1,
        useEnhanced: true,
      },
      audio: {
        content: audioContent,
      },
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} ${error}`);
    }

    const result = await response.json();

    if (!result.results || result.results.length === 0) {
      return { transcript: '', confidence: 0 };
    }

    const primaryResult = result.results[0];
    const alternative = primaryResult.alternatives?.[0];

    return {
      transcript: alternative?.transcript || '',
      confidence: alternative?.confidence || 0,
    };
  }

  private analyzeResults(
    results: TranscriptionResult[],
  ): {
    bestLanguage: string;
    bestSampleRate: number;
    bestModel: string;
    averageConfidence: number;
  } | null {
    if (results.length === 0) return null;

    const top5 = results.slice(0, 5);

    // Count most common configurations in top results
    const languageCounts = new Map<string, number>();
    const sampleRateCounts = new Map<number, number>();
    const modelCounts = new Map<string, number>();

    top5.forEach((r) => {
      languageCounts.set(
        r.config.languageCode,
        (languageCounts.get(r.config.languageCode) || 0) + 1,
      );
      sampleRateCounts.set(
        r.config.sampleRateHertz,
        (sampleRateCounts.get(r.config.sampleRateHertz) || 0) + 1,
      );
      modelCounts.set(
        r.config.model,
        (modelCounts.get(r.config.model) || 0) + 1,
      );
    });

    const bestLanguage =
      Array.from(languageCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      results[0].config.languageCode;
    const bestSampleRate =
      Array.from(sampleRateCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      results[0].config.sampleRateHertz;
    const bestModel =
      Array.from(modelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      results[0].config.model;

    const averageConfidence =
      top5.reduce((sum, r) => sum + r.confidence, 0) / top5.length;

    return {
      bestLanguage,
      bestSampleRate,
      bestModel,
      averageConfidence,
    };
  }

  private detectMimeType(file: Express.Multer.File): string {
    if (file.mimetype && file.mimetype !== 'application/octet-stream') {
      return file.mimetype;
    }

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

  private getAudioEncoding(mimeType: string): string | null {
    const mimeToEncoding: Record<string, string> = {
      'audio/wav': 'LINEAR16',
      'audio/x-wav': 'LINEAR16',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/ogg': 'OGG_OPUS',
      'audio/opus': 'OGG_OPUS',
      'audio/webm': 'WEBM_OPUS',
      'audio/flac': 'FLAC',
    };

    return mimeToEncoding[mimeType.toLowerCase()] || null;
  }
}
