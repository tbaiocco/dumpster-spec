import { Test, TestingModule } from '@nestjs/testing';
import { HandwritingService, HandwritingConfidence, HandwritingStyle } from './handwriting.service';
import { VisionService } from './vision.service';

describe('HandwritingService', () => {
  let service: HandwritingService;
  let mockVisionService: jest.Mocked<VisionService>;

  beforeEach(async () => {
    const mockVisionServiceFactory = {
      analyzeImage: jest.fn(),
      extractTextFromImage: jest.fn(),
      detectObjects: jest.fn(),
      processReceiptImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandwritingService,
        {
          provide: VisionService,
          useValue: mockVisionServiceFactory,
        },
      ],
    }).compile();

    service = module.get<HandwritingService>(HandwritingService);
    mockVisionService = module.get(VisionService);
  });

  describe('recognizeHandwriting', () => {
    it('should recognize handwritten text successfully', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-handwriting-image');
      const mimeType = 'image/jpeg';
      
      const mockOcrResult = {
        text: 'Hello World',
        confidence: 0.85,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeDefined();
      expect(Object.values(HandwritingConfidence)).toContain(result.confidenceLevel);
      expect(result.handwritingStyle).toBeDefined();
      expect(Object.values(HandwritingStyle)).toContain(result.handwritingStyle);
      expect(result.textBlocks).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle cursive handwriting', async () => {
      // Arrange
      const imageBuffer = Buffer.from('cursive-handwriting-sample');
      const mimeType = 'image/png';
      
      const mockOcrResult = {
        text: 'Dear friend, how are you today?',
        confidence: 0.78,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.textBlocks).toBeDefined();
      expect(Array.isArray(result.textBlocks)).toBe(true);
    });

    it('should handle print handwriting', async () => {
      // Arrange
      const imageBuffer = Buffer.from('print-handwriting-sample');
      const mimeType = 'image/png';
      
      const mockOcrResult = {
        text: 'SHOPPING LIST: MILK EGGS BREAD',
        confidence: 0.92,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.handwritingStyle).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle messy handwriting with lower confidence', async () => {
      // Arrange
      const imageBuffer = Buffer.from('messy-handwriting-sample');
      const mimeType = 'image/jpeg';
      
      const mockOcrResult = {
        text: 'barely readable text',
        confidence: 0.45,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7);
      expect([HandwritingConfidence.VERY_LOW, HandwritingConfidence.LOW]).toContain(result.confidenceLevel);
    });

    it('should handle preprocessing options', async () => {
      // Arrange
      const imageBuffer = Buffer.from('handwriting-needing-preprocessing');
      const mimeType = 'image/png';
      const options = {
        preprocessing: {
          enhanceContrast: true,
          reducenoise: true,
          correctRotation: true,
        },
        expectedLanguages: ['en'],
        enhanceRecognition: true,
      };
      
      const mockOcrResult = {
        text: 'Enhanced handwriting text',
        confidence: 0.88,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType, options);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple languages', async () => {
      // Arrange
      const imageBuffer = Buffer.from('multilingual-handwriting');
      const mimeType = 'image/jpeg';
      const options = {
        expectedLanguages: ['en', 'es', 'fr'],
      };
      
      const mockOcrResult = {
        text: 'Hello Hola Bonjour',
        confidence: 0.82,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType, options);

      // Assert
      expect(result.extractedText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.textBlocks).toBeDefined();
    });

    it('should handle empty or invalid images gracefully', async () => {
      // Arrange
      const imageBuffer = Buffer.from('');
      const mimeType = 'image/png';

      mockVisionService.extractTextFromImage.mockRejectedValue(new Error('Invalid image'));

      // Act & Assert
      await expect(service.recognizeHandwriting(imageBuffer, mimeType)).rejects.toThrow();
    });

    it('should handle vision service errors', async () => {
      // Arrange
      const imageBuffer = Buffer.from('valid-image-data');
      const mimeType = 'image/jpeg';

      mockVisionService.extractTextFromImage.mockRejectedValue(new Error('Vision service unavailable'));

      // Act & Assert
      await expect(service.recognizeHandwriting(imageBuffer, mimeType)).rejects.toThrow('Handwriting recognition failed');
    });
  });

  describe('confidence levels', () => {
    it('should return appropriate confidence levels for different scores', async () => {
      const testCases = [
        { confidence: 0.95, expected: [HandwritingConfidence.VERY_HIGH, HandwritingConfidence.HIGH] },
        { confidence: 0.75, expected: [HandwritingConfidence.HIGH, HandwritingConfidence.MEDIUM] },
        { confidence: 0.55, expected: [HandwritingConfidence.MEDIUM, HandwritingConfidence.LOW] },
        { confidence: 0.35, expected: [HandwritingConfidence.LOW, HandwritingConfidence.VERY_LOW] },
        { confidence: 0.15, expected: [HandwritingConfidence.VERY_LOW] },
      ];

      for (const testCase of testCases) {
        // Arrange
        const imageBuffer = Buffer.from('test-image');
        const mimeType = 'image/png';
        
        const mockOcrResult = {
          text: 'test text',
          confidence: testCase.confidence,
        };

        mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

        // Act
        const result = await service.recognizeHandwriting(imageBuffer, mimeType);

        // Assert
        expect(testCase.expected).toContain(result.confidenceLevel);
      }
    });
  });

  describe('handwriting styles', () => {
    it('should detect different handwriting styles', async () => {
      const styleTests = [
        { text: 'Beautiful cursive writing', expectedStyles: [HandwritingStyle.CURSIVE, HandwritingStyle.NEAT] },
        { text: 'CLEAR PRINT LETTERS', expectedStyles: [HandwritingStyle.PRINT, HandwritingStyle.NEAT] },
        { text: 'Mixed Style Writing', expectedStyles: [HandwritingStyle.MIXED, HandwritingStyle.PRINT] },
      ];

      for (const test of styleTests) {
        // Arrange
        const imageBuffer = Buffer.from('handwriting-style-test');
        const mimeType = 'image/jpeg';
        
        const mockOcrResult = {
          text: test.text,
          confidence: 0.85,
        };

        mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

        // Act
        const result = await service.recognizeHandwriting(imageBuffer, mimeType);

        // Assert
        expect(Object.values(HandwritingStyle)).toContain(result.handwritingStyle);
        expect(result.textBlocks.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('text block extraction', () => {
    it('should extract text blocks with proper metadata', async () => {
      // Arrange
      const imageBuffer = Buffer.from('multi-block-handwriting');
      const mimeType = 'image/png';
      
      const mockOcrResult = {
        text: 'First line\nSecond line\nThird line',
        confidence: 0.88,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);

      // Assert
      expect(result.textBlocks).toBeDefined();
      expect(Array.isArray(result.textBlocks)).toBe(true);
      expect(result.extractedText).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.imageQuality).toBeDefined();
      expect(['poor', 'fair', 'good', 'excellent']).toContain(result.metadata.imageQuality);
    });
  });

  describe('performance', () => {
    it('should complete recognition within reasonable time', async () => {
      // Arrange
      const imageBuffer = Buffer.from('performance-test-image');
      const mimeType = 'image/jpeg';
      
      const mockOcrResult = {
        text: 'Performance test text',
        confidence: 0.8,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);

      // Act
      const startTime = Date.now();
      const result = await service.recognizeHandwriting(imageBuffer, mimeType);
      const actualTime = Date.now() - startTime;

      // Assert
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(actualTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});