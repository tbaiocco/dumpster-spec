import { Test, TestingModule } from '@nestjs/testing';
import { DocumentProcessorService } from './document-processor.service';
import { VisionService } from './vision.service';
import { EntityExtractionService } from './extraction.service';

describe('DocumentProcessorService', () => {
  let service: DocumentProcessorService;

  const mockVisionService = {
    extractTextFromImage: jest.fn(),
    detectDocumentType: jest.fn(),
  };

  const mockEntityExtractionService = {
    extractEntities: jest.fn(),
    extractAmounts: jest.fn(),
    extractDates: jest.fn(),
    extractContacts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentProcessorService,
        {
          provide: VisionService,
          useValue: mockVisionService,
        },
        {
          provide: EntityExtractionService,
          useValue: mockEntityExtractionService,
        },
      ],
    }).compile();

    service = module.get<DocumentProcessorService>(DocumentProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDocument', () => {
    const mockImageBuffer = Buffer.from('test image data');
    const mimeType = 'image/jpeg';

    it('should process a document successfully', async () => {
      // Arrange
      const mockOcrResult = {
        text: 'Receipt\nStore: Test Store\nTotal: $25.99\nDate: 2024-01-15',
        confidence: 0.95,
      };

      const mockDocumentType = {
        type: 'receipt',
        confidence: 0.9,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);
      mockVisionService.detectDocumentType.mockResolvedValue(mockDocumentType);

      // Act
      const result = await service.processDocument(mockImageBuffer, mimeType);

      // Assert
      expect(result).toBeDefined();
      expect(result.extractedText).toBe(mockOcrResult.text);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.entities).toBeDefined();
      expect(result.structuredData).toBeDefined();
      expect(result.processingMetadata).toBeDefined();
    });

    it('should handle vision service errors gracefully', async () => {
      // Arrange
      mockVisionService.extractTextFromImage.mockRejectedValue(new Error('Vision service failed'));

      // Act & Assert
      await expect(service.processDocument(mockImageBuffer, mimeType)).rejects.toThrow();
    });

  });
});