import { Injectable, Logger } from '@nestjs/common';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GoogleCloudConfig {
  projectId: string;
  keyFilename?: string;
  location: string;
}

export interface SpeechToTextConfig extends GoogleCloudConfig {
  languageCode: string;
  encoding: string;
  sampleRateHertz: number;
}

export interface VisionConfig extends GoogleCloudConfig {
  features: string[];
}

@Injectable()
export class AIConfig {
  private readonly logger = new Logger(AIConfig.name);

  constructor() {
    this.validateEnvironmentVariables();
    this.logger.log('AI services configuration initialized');
  }

  private validateEnvironmentVariables(): void {
    const required = ['CLAUDE_API_KEY', 'GOOGLE_CLOUD_PROJECT_ID'];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }
  }

  getClaudeConfig(): ClaudeConfig {
    return {
      apiKey: process.env.CLAUDE_API_KEY!,
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: Number.parseInt(process.env.CLAUDE_MAX_TOKENS || '4000', 10),
      temperature: Number.parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
    };
  }

  getSpeechToTextConfig(): SpeechToTextConfig {
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
      languageCode: process.env.SPEECH_LANGUAGE_CODE || 'en-US',
      encoding: process.env.SPEECH_ENCODING || 'WEBM_OPUS',
      sampleRateHertz: Number.parseInt(
        process.env.SPEECH_SAMPLE_RATE || '48000',
        10,
      ),
    };
  }

  getVisionConfig(): VisionConfig {
    const defaultFeatures = [
      'TEXT_DETECTION',
      'DOCUMENT_TEXT_DETECTION',
      'OBJECT_LOCALIZATION',
    ];

    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
      features: process.env.VISION_FEATURES?.split(',') || defaultFeatures,
    };
  }

  getProcessingConfig() {
    return {
      confidenceThreshold: Number.parseFloat(
        process.env.AI_CONFIDENCE_THRESHOLD || '0.4',
      ),
      maxRetries: Number.parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      timeoutMs: Number.parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
      fallbackCategory: process.env.AI_FALLBACK_CATEGORY || 'Uncategorized',
      enableEmbeddings: process.env.ENABLE_EMBEDDINGS === 'true',
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    };
  }

  getCategoryMappings(): Record<string, string[]> {
    // Default category keywords for AI classification
    return {
      'Personal Tasks': ['todo', 'task', 'remember', 'need to', "don't forget"],
      'Work & Business': [
        'work',
        'meeting',
        'project',
        'deadline',
        'business',
        'office',
      ],
      'Shopping & Purchases': [
        'buy',
        'purchase',
        'shopping',
        'order',
        'price',
        'store',
      ],
      'Health & Wellness': [
        'doctor',
        'appointment',
        'health',
        'medical',
        'exercise',
        'fitness',
      ],
      'Finance & Bills': [
        'bill',
        'payment',
        'money',
        'bank',
        'finance',
        'budget',
      ],
      'Home & Family': [
        'home',
        'family',
        'kids',
        'house',
        'repair',
        'maintenance',
      ],
      'Travel & Events': [
        'travel',
        'trip',
        'flight',
        'hotel',
        'event',
        'ticket',
      ],
      'Learning & Development': [
        'learn',
        'course',
        'book',
        'study',
        'skill',
        'education',
      ],
      'Social & Relationships': [
        'friend',
        'social',
        'party',
        'birthday',
        'relationship',
      ],
      'Ideas & Inspiration': [
        'idea',
        'inspiration',
        'creative',
        'innovation',
        'brainstorm',
      ],
      'Documents & Files': [
        'document',
        'file',
        'paperwork',
        'form',
        'certificate',
      ],
    };
  }

  getUrgencyKeywords(): Record<number, string[]> {
    return {
      5: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now'],
      4: ['important', 'soon', 'priority', 'deadline', 'today'],
      3: ['this week', 'moderate', 'normal', 'regular'],
      2: ['low priority', 'when possible', 'eventually', 'someday'],
      1: ['no rush', 'low', 'maybe', 'if time permits'],
    };
  }
}
