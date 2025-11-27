import { Test, TestingModule } from '@nestjs/testing';
import {
  MultiLanguageSpeechService,
  SupportedLanguage,
} from './multi-lang-speech.service';
import { SpeechService } from './speech.service';

describe('MultiLanguageSpeechService', () => {
  let service: MultiLanguageSpeechService;
  let mockSpeechService: jest.Mocked<SpeechService>;

  beforeEach(async () => {
    const mockSpeechServiceFactory = {
      transcribeAudio: jest.fn(),
      synthesizeSpeech: jest.fn(),
      detectSpeechLanguage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiLanguageSpeechService,
        {
          provide: SpeechService,
          useValue: mockSpeechServiceFactory,
        },
      ],
    }).compile();

    service = module.get<MultiLanguageSpeechService>(
      MultiLanguageSpeechService,
    );
    mockSpeechService = module.get(SpeechService);
  });

  describe('transcribeWithLanguage', () => {
    it('should transcribe English audio successfully', async () => {
      // Arrange
      const audioData = Buffer.from('mock-audio-data');
      const audioFormat = 'audio/wav';
      const mockTranscription = {
        transcript: 'Hello, this is a test message in English.',
        confidence: 0.95,
        languageCode: 'en',
      };

      mockSpeechService.transcribeAudio.mockResolvedValue(mockTranscription);

      // Act
      const result = await service.transcribeWithLanguage(
        audioData,
        audioFormat,
        SupportedLanguage.ENGLISH,
      );

      // Assert
      expect(result.text).toBe('Hello, this is a test message in English.');
      expect(result.detectedLanguage).toBe(SupportedLanguage.ENGLISH);
      expect(result.confidence).toBe(1.0);
      expect(mockSpeechService.transcribeAudio).toHaveBeenCalledWith({
        audioBuffer: audioData,
        mimeType: audioFormat,
        languageCode: SupportedLanguage.ENGLISH,
      });
    });

    it('should transcribe Spanish audio with language detection', async () => {
      // Arrange
      const audioData = Buffer.from('mock-spanish-audio');
      const mockTranscription = {
        text: 'Hola, este es un mensaje de prueba en español.',
        confidence: 0.92,
        language: 'es-ES',
        segments: [
          {
            text: 'Hola, este es un mensaje de prueba en español.',
            start: 0,
            end: 4.2,
          },
        ],
      };

      mockSpeechService.transcribeAudio.mockResolvedValue(mockTranscription);

      // Act
      const result = await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.SPANISH,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.transcription).toBe(
        'Hola, este es un mensaje de prueba en español.',
      );
      expect(result.detectedLanguage).toBe(SupportedLanguage.SPANISH);
      expect(result.confidence).toBe(0.92);
    });

    it('should auto-detect language when not specified', async () => {
      // Arrange
      const audioData = Buffer.from('mock-french-audio');
      const mockDetection = {
        language: 'fr-FR',
        confidence: 0.88,
      };
      const mockTranscription = {
        text: 'Bonjour, ceci est un message de test en français.',
        confidence: 0.89,
        language: 'fr-FR',
        segments: [],
      };

      mockSpeechService.detectSpeechLanguage.mockResolvedValue(mockDetection);
      mockSpeechService.transcribeAudio.mockResolvedValue(mockTranscription);

      // Act
      const result = await service.transcribeMultiLanguage(audioData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.transcription).toBe(
        'Bonjour, ceci est un message de test en français.',
      );
      expect(result.detectedLanguage).toBe(SupportedLanguage.FRENCH);
      expect(mockSpeechService.detectSpeechLanguage).toHaveBeenCalledWith(
        audioData,
      );
    });

    it('should handle transcription errors gracefully', async () => {
      // Arrange
      const audioData = Buffer.from('invalid-audio-data');
      mockSpeechService.transcribeAudio.mockRejectedValue(
        new Error('Audio format not supported'),
      );

      // Act
      const result = await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.ENGLISH,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio format not supported');
      expect(result.transcription).toBeUndefined();
    });
  });

  describe('detectLanguage', () => {
    it('should detect English language correctly', async () => {
      // Arrange
      const audioData = Buffer.from('english-audio-sample');
      const mockDetection = {
        language: 'en-US',
        confidence: 0.96,
      };

      mockSpeechService.detectSpeechLanguage.mockResolvedValue(mockDetection);

      // Act
      const result = await service.detectLanguage(audioData);

      // Assert
      expect(result.detectedLanguage).toBe(SupportedLanguage.ENGLISH);
      expect(result.confidence).toBe(0.96);
      expect(result.alternativeLanguages).toBeDefined();
    });

    it('should detect multiple possible languages with confidence scores', async () => {
      // Arrange
      const audioData = Buffer.from('multilingual-audio');
      const mockDetection = {
        language: 'es-ES',
        confidence: 0.75,
        alternatives: [
          { language: 'pt-BR', confidence: 0.65 },
          { language: 'it-IT', confidence: 0.6 },
        ],
      };

      mockSpeechService.detectSpeechLanguage.mockResolvedValue(mockDetection);

      // Act
      const result = await service.detectLanguage(audioData);

      // Assert
      expect(result.detectedLanguage).toBe(SupportedLanguage.SPANISH);
      expect(result.confidence).toBe(0.75);
      expect(result.alternativeLanguages).toContain(
        SupportedLanguage.PORTUGUESE,
      );
      expect(result.alternativeLanguages).toContain(SupportedLanguage.ITALIAN);
    });

    it('should handle unsupported languages', async () => {
      // Arrange
      const audioData = Buffer.from('uncommon-language-audio');
      const mockDetection = {
        language: 'hi-IN', // Hindi - not in our supported list
        confidence: 0.85,
      };

      mockSpeechService.detectSpeechLanguage.mockResolvedValue(mockDetection);

      // Act
      const result = await service.detectLanguage(audioData);

      // Assert
      expect(result.detectedLanguage).toBe(SupportedLanguage.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5); // Should reduce confidence for unsupported languages
    });
  });

  describe('batchTranscribe', () => {
    it('should transcribe multiple audio files in different languages', async () => {
      // Arrange
      const audioFiles = [
        {
          data: Buffer.from('english-audio'),
          language: SupportedLanguage.ENGLISH,
        },
        {
          data: Buffer.from('spanish-audio'),
          language: SupportedLanguage.SPANISH,
        },
        {
          data: Buffer.from('french-audio'),
          language: SupportedLanguage.FRENCH,
        },
      ];

      mockSpeechService.transcribeAudio
        .mockResolvedValueOnce({
          text: 'English transcription',
          confidence: 0.95,
          language: 'en-US',
          segments: [],
        })
        .mockResolvedValueOnce({
          text: 'Transcripción en español',
          confidence: 0.92,
          language: 'es-ES',
          segments: [],
        })
        .mockResolvedValueOnce({
          text: 'Transcription en français',
          confidence: 0.9,
          language: 'fr-FR',
          segments: [],
        });

      // Act
      const results = await service.batchTranscribe(audioFiles);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].transcription).toBe('English transcription');
      expect(results[1].transcription).toBe('Transcripción en español');
      expect(results[2].transcription).toBe('Transcription en français');
    });

    it('should handle partial failures in batch processing', async () => {
      // Arrange
      const audioFiles = [
        {
          data: Buffer.from('valid-audio'),
          language: SupportedLanguage.ENGLISH,
        },
        {
          data: Buffer.from('invalid-audio'),
          language: SupportedLanguage.SPANISH,
        },
      ];

      mockSpeechService.transcribeAudio
        .mockResolvedValueOnce({
          text: 'Valid transcription',
          confidence: 0.95,
          language: 'en-US',
          segments: [],
        })
        .mockRejectedValueOnce(new Error('Transcription failed'));

      // Act
      const results = await service.batchTranscribe(audioFiles);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Transcription failed');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      // Act
      const languages = service.getSupportedLanguages();

      // Assert
      expect(languages).toContain(SupportedLanguage.ENGLISH);
      expect(languages).toContain(SupportedLanguage.SPANISH);
      expect(languages).toContain(SupportedLanguage.FRENCH);
      expect(languages).toContain(SupportedLanguage.GERMAN);
      expect(languages).toContain(SupportedLanguage.ITALIAN);
      expect(languages).toContain(SupportedLanguage.PORTUGUESE);
      expect(languages).toContain(SupportedLanguage.RUSSIAN);
      expect(languages).toContain(SupportedLanguage.CHINESE);
      expect(languages).toContain(SupportedLanguage.JAPANESE);
    });
  });

  describe('getLanguageStatistics', () => {
    it('should return language usage statistics', async () => {
      // Arrange - Process some audio to build statistics
      const audioData = Buffer.from('test-audio');

      mockSpeechService.transcribeAudio.mockResolvedValue({
        text: 'Test transcription',
        confidence: 0.95,
        language: 'en-US',
        segments: [],
      });

      // Process multiple times to build stats
      await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.ENGLISH,
      );
      await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.ENGLISH,
      );
      await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.SPANISH,
      );

      // Act
      const stats = await service.getLanguageStatistics();

      // Assert
      expect(stats.totalTranscriptions).toBe(3);
      expect(stats.languageBreakdown).toBeDefined();
      expect(stats.languageBreakdown[SupportedLanguage.ENGLISH]).toBe(2);
      expect(stats.languageBreakdown[SupportedLanguage.SPANISH]).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });

  describe('optimizeForLanguage', () => {
    it('should optimize transcription settings for specific language', async () => {
      // Arrange
      const audioData = Buffer.from('chinese-audio');
      const optimizedSettings = {
        language: 'zh-CN',
        model: 'chinese-optimized',
        enhanceForAccent: true,
      };

      mockSpeechService.transcribeAudio.mockResolvedValue({
        text: '这是中文测试',
        confidence: 0.88,
        language: 'zh-CN',
        segments: [],
      });

      // Act
      const result = await service.optimizeForLanguage(
        audioData,
        SupportedLanguage.CHINESE,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.transcription).toBe('这是中文测试');
      expect(result.optimizationApplied).toBe(true);
      expect(result.settings).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty audio data', async () => {
      // Arrange
      const emptyAudio = Buffer.alloc(0);

      // Act
      const result = await service.transcribeMultiLanguage(
        emptyAudio,
        SupportedLanguage.ENGLISH,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty audio data');
    });

    it('should handle very short audio clips', async () => {
      // Arrange
      const shortAudio = Buffer.from('short');
      mockSpeechService.transcribeAudio.mockResolvedValue({
        text: '',
        confidence: 0.1,
        language: 'en-US',
        segments: [],
      });

      // Act
      const result = await service.transcribeMultiLanguage(
        shortAudio,
        SupportedLanguage.ENGLISH,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.transcription).toBe('');
    });

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      const audioData = Buffer.from('timeout-test-audio');
      mockSpeechService.transcribeAudio.mockRejectedValue(
        new Error('Request timeout'),
      );

      // Act
      const result = await service.transcribeMultiLanguage(
        audioData,
        SupportedLanguage.ENGLISH,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle concurrent transcription requests', async () => {
      // Arrange
      const audioData1 = Buffer.from('audio1');
      const audioData2 = Buffer.from('audio2');
      const audioData3 = Buffer.from('audio3');

      mockSpeechService.transcribeAudio.mockImplementation((audio) => {
        const audioStr = audio.toString();
        return Promise.resolve({
          text: `Transcription for ${audioStr}`,
          confidence: 0.9,
          language: 'en-US',
          segments: [],
        });
      });

      // Act
      const results = await Promise.all([
        service.transcribeMultiLanguage(audioData1, SupportedLanguage.ENGLISH),
        service.transcribeMultiLanguage(audioData2, SupportedLanguage.ENGLISH),
        service.transcribeMultiLanguage(audioData3, SupportedLanguage.ENGLISH),
      ]);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
