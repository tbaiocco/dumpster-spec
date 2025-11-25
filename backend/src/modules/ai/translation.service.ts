import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from './claude.service';

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  context?: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

/**
 * Translation service using AI for natural language translation
 * Supports translation of user-facing text to various languages
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  // Cache translations to avoid redundant API calls
  private translationCache = new Map<string, string>();

  constructor(private readonly claudeService: ClaudeService) {}

  /**
   * Translate text to target language
   * Uses caching to optimize repeated translations
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, targetLanguage, sourceLanguage = 'en', context } = request;

    // Skip translation if target is English (default)
    if (targetLanguage === 'en' || targetLanguage === 'en-US') {
      return {
        translatedText: text,
        detectedSourceLanguage: sourceLanguage,
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(text, targetLanguage);
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Using cached translation for language: ${targetLanguage}`);
      return {
        translatedText: cached,
        detectedSourceLanguage: sourceLanguage,
      };
    }

    try {
      this.logger.debug(`Translating text to ${targetLanguage}`);

      const prompt = this.buildTranslationPrompt(
        text,
        targetLanguage,
        sourceLanguage,
        context,
      );

      const translatedText = await this.claudeService.queryWithCustomPrompt(prompt);

      // Cache the translation
      this.translationCache.set(cacheKey, translatedText);

      // Limit cache size to prevent memory issues
      if (this.translationCache.size > 1000) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      return {
        translatedText,
        detectedSourceLanguage: sourceLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Translation failed for language ${targetLanguage}`,
        error,
      );
      
      // Fallback to original text if translation fails
      return {
        translatedText: text,
        detectedSourceLanguage: sourceLanguage,
      };
    }
  }

  /**
   * Translate multiple text segments in batch
   * More efficient than individual translations
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage = 'en',
  ): Promise<string[]> {
    // Skip translation if target is English
    if (targetLanguage === 'en' || targetLanguage === 'en-US') {
      return texts;
    }

    try {
      this.logger.debug(
        `Batch translating ${texts.length} texts to ${targetLanguage}`,
      );

      const prompt = this.buildBatchTranslationPrompt(
        texts,
        targetLanguage,
        sourceLanguage,
      );

      const response = await this.claudeService.queryWithCustomPrompt(prompt);

      // Parse response - expect one translation per line
      const translations = response
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\d+\.\s*/, '').trim());

      // Ensure we have the same number of translations as inputs
      if (translations.length !== texts.length) {
        this.logger.warn(
          `Translation count mismatch: expected ${texts.length}, got ${translations.length}`,
        );
        return texts; // Fallback to original texts
      }

      return translations;
    } catch (error) {
      this.logger.error(
        `Batch translation failed for language ${targetLanguage}`,
        error,
      );
      return texts; // Fallback to original texts
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    this.logger.log('Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.translationCache.size,
      maxSize: 1000,
    };
  }

  // Private helper methods

  private getCacheKey(text: string, targetLanguage: string): string {
    // Create a simple hash-like key
    const textHash = text.substring(0, 100); // Use first 100 chars
    return `${targetLanguage}:${textHash}`;
  }

  private buildTranslationPrompt(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    context?: string,
  ): string {
    let prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}.`;

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += `\n\nIMPORTANT:
- Provide ONLY the translation, no explanations or additional text
- Maintain the original tone and style
- Preserve any emojis, formatting, or special characters
- Keep technical terms accurate
- Use natural, native-speaker language

Text to translate:
${text}

Translation:`;

    return prompt;
  }

  private buildBatchTranslationPrompt(
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string,
  ): string {
    const numberedTexts = texts
      .map((text, index) => `${index + 1}. ${text}`)
      .join('\n');

    return `Translate the following ${texts.length} texts from ${sourceLanguage} to ${targetLanguage}.

IMPORTANT:
- Provide ONLY the translations, one per line
- Number each translation to match the input (1., 2., 3., etc.)
- Maintain the original tone and style
- Preserve any emojis, formatting, or special characters
- Keep technical terms accurate
- Use natural, native-speaker language

Texts to translate:
${numberedTexts}

Translations:`;
  }

  /**
   * Get the language name from code (for logging/display)
   */
  getLanguageName(languageCode: string): string {
    const languageNames: Record<string, string> = {
      en: 'English',
      pt: 'Portuguese',
      'pt-BR': 'Portuguese (Brazil)',
      'pt-PT': 'Portuguese (Portugal)',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      ja: 'Japanese',
      zh: 'Chinese',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      ko: 'Korean',
      ar: 'Arabic',
      ru: 'Russian',
      hi: 'Hindi',
      nl: 'Dutch',
      sv: 'Swedish',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
      pl: 'Polish',
      tr: 'Turkish',
      th: 'Thai',
      vi: 'Vietnamese',
      id: 'Indonesian',
    };

    return languageNames[languageCode] || languageCode;
  }
}
