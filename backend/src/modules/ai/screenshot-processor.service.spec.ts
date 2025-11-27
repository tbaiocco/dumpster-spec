import { Test, TestingModule } from '@nestjs/testing';
import { ScreenshotProcessorService } from './screenshot-processor.service';
import { VisionService } from './vision.service';

describe('ScreenshotProcessorService', () => {
  let service: ScreenshotProcessorService;
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
        ScreenshotProcessorService,
        {
          provide: VisionService,
          useValue: mockVisionServiceFactory,
        },
      ],
    }).compile();

    service = module.get<ScreenshotProcessorService>(
      ScreenshotProcessorService,
    );
    mockVisionService = module.get(VisionService);
  });

  describe('processScreenshot', () => {
    it('should process screenshot successfully', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const mimeType = 'image/png';

      const mockOcrResult = {
        text: 'Username Password Login Sign Up',
        confidence: 0.95,
      };

      const mockAnalysisResult = {
        extractedText: 'Username Password Login Sign Up',
        textConfidence: 0.95,
      };

      mockVisionService.extractTextFromImage.mockResolvedValue(mockOcrResult);
      mockVisionService.analyzeImage.mockResolvedValue(mockAnalysisResult);

      // Act
      const result = await service.processScreenshot(imageBuffer, mimeType);

      // Assert
      expect(result.extractedText).toBe('Username Password Login Sign Up');
      expect(result.confidence).toBe(0.95);
      expect(result.detectedElements).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.processingDuration).toBeGreaterThan(0);
      expect(mockVisionService.extractTextFromImage).toHaveBeenCalledWith(
        imageBuffer,
        mimeType,
        ['en'],
      );
    });

    it('should process dashboard screenshot with multiple UI elements', async () => {
      // Arrange
      const screenshotData = 'base64-encoded-dashboard-screenshot';
      const mockAnalysis = {
        extractedText:
          'Dashboard Analytics Reports Settings Profile Menu Notifications 15 New Messages',
        detectedElements: [
          {
            type: 'navigation',
            confidence: 0.88,
            bounds: { x: 0, y: 0, width: 200, height: 600 },
            text: 'sidebar_menu',
          },
          {
            type: 'card',
            confidence: 0.85,
            bounds: { x: 220, y: 50, width: 250, height: 150 },
            text: 'analytics_card',
          },
          {
            type: 'chart',
            confidence: 0.82,
            bounds: { x: 500, y: 50, width: 300, height: 200 },
            text: 'revenue_chart',
          },
        ],
        metadata: {
          pageType: 'dashboard',
          confidence: 0.87,
        },
        processingDuration: 1800,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      expect(result.extractedText).toContain('Dashboard');
      expect(result.extractedText).toContain('Analytics');
      expect(result.detectedElements).toHaveLength(3);
      expect(
        result.detectedElements.find((e) => e.type === 'navigation'),
      ).toBeDefined();
      expect(
        result.detectedElements.find((e) => e.type === 'chart'),
      ).toBeDefined();
      expect(result.metadata.pageType).toBe('dashboard');
    });

    it('should process e-commerce product page screenshot', async () => {
      // Arrange
      const screenshotData = 'base64-encoded-ecommerce-screenshot';
      const mockAnalysis = {
        extractedText:
          'Product Name $29.99 Add to Cart Buy Now Product Description Reviews 4.5/5 stars In Stock',
        detectedElements: [
          {
            type: 'image',
            confidence: 0.94,
            bounds: { x: 50, y: 100, width: 400, height: 400 },
            text: 'product_image',
          },
          {
            type: 'button',
            confidence: 0.91,
            bounds: { x: 500, y: 250, width: 150, height: 50 },
            text: 'add_to_cart',
          },
          {
            type: 'button',
            confidence: 0.89,
            bounds: { x: 500, y: 310, width: 150, height: 50 },
            text: 'buy_now',
          },
          {
            type: 'text',
            confidence: 0.86,
            bounds: { x: 500, y: 200, width: 100, height: 30 },
            text: 'price_display',
          },
        ],
        metadata: {
          pageType: 'product',
          confidence: 0.9,
        },
        processingDuration: 1650,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      expect(result.extractedText).toContain('$29.99');
      expect(result.extractedText).toContain('Add to Cart');
      expect(result.detectedElements).toHaveLength(4);
      expect(
        result.detectedElements.filter((e) => e.type === 'button'),
      ).toHaveLength(2);
      expect(result.metadata.pageType).toBe('product');
    });

    it('should handle mobile app screenshot with touch elements', async () => {
      // Arrange
      const screenshotData = 'base64-encoded-mobile-screenshot';
      const mockAnalysis = {
        extractedText: 'Home Messages Profile Settings Back Menu',
        detectedElements: [
          {
            type: 'tab_bar',
            confidence: 0.87,
            bounds: { x: 0, y: 500, width: 375, height: 80 },
            text: 'bottom_navigation',
          },
          {
            type: 'header',
            confidence: 0.85,
            bounds: { x: 0, y: 0, width: 375, height: 60 },
            text: 'top_header',
          },
          {
            type: 'list_item',
            confidence: 0.83,
            bounds: { x: 10, y: 80, width: 355, height: 60 },
            text: 'message_item_1',
          },
        ],
        metadata: {
          pageType: 'mobile_app',
          confidence: 0.84,
          platform: 'mobile',
        },
        processingDuration: 950,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      expect(result.detectedElements).toHaveLength(3);
      expect(result.metadata.pageType).toBe('mobile_app');
      expect(result.metadata.platform).toBe('mobile');
      expect(result.processingDuration).toBeLessThan(1500);
    });

    it('should handle vision service errors gracefully', async () => {
      // Arrange
      const screenshotData = 'invalid-screenshot-data';
      mockVisionService.analyzeScreenshot.mockRejectedValue(
        new Error('Image analysis failed'),
      );

      // Act & Assert
      await expect(service.processScreenshot(screenshotData)).rejects.toThrow(
        'Image analysis failed',
      );
    });
  });

  describe('extractUIElements', () => {
    it('should categorize UI elements correctly', async () => {
      // Arrange
      const screenshotData = 'base64-form-screenshot';
      const mockAnalysis = {
        extractedText: 'Submit Cancel Name Email Phone',
        detectedElements: [
          {
            type: 'form',
            confidence: 0.9,
            bounds: { x: 100, y: 100, width: 400, height: 300 },
            text: 'contact_form',
          },
          {
            type: 'input',
            confidence: 0.88,
            bounds: { x: 120, y: 140, width: 200, height: 30 },
            text: 'name_input',
          },
          {
            type: 'input',
            confidence: 0.87,
            bounds: { x: 120, y: 180, width: 200, height: 30 },
            text: 'email_input',
          },
          {
            type: 'button',
            confidence: 0.85,
            bounds: { x: 150, y: 250, width: 80, height: 35 },
            text: 'submit_button',
          },
        ],
        metadata: {
          pageType: 'form',
          confidence: 0.89,
        },
        processingDuration: 1100,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      const formElements = result.detectedElements.filter(
        (e) => e.type === 'form',
      );
      const inputElements = result.detectedElements.filter(
        (e) => e.type === 'input',
      );
      const buttonElements = result.detectedElements.filter(
        (e) => e.type === 'button',
      );

      expect(formElements).toHaveLength(1);
      expect(inputElements).toHaveLength(2);
      expect(buttonElements).toHaveLength(1);
    });
  });

  describe('detectInteractiveElements', () => {
    it('should identify clickable and interactive elements', async () => {
      // Arrange
      const screenshotData = 'base64-interactive-page';
      const mockAnalysis = {
        extractedText:
          'Click Here Download Button Link Menu Dropdown Checkbox Radio',
        detectedElements: [
          {
            type: 'link',
            confidence: 0.92,
            bounds: { x: 50, y: 50, width: 100, height: 20 },
            text: 'header_link',
          },
          {
            type: 'button',
            confidence: 0.89,
            bounds: { x: 200, y: 100, width: 120, height: 40 },
            text: 'download_btn',
          },
          {
            type: 'dropdown',
            confidence: 0.86,
            bounds: { x: 350, y: 200, width: 150, height: 35 },
            text: 'menu_dropdown',
          },
          {
            type: 'checkbox',
            confidence: 0.84,
            bounds: { x: 100, y: 300, width: 20, height: 20 },
            text: 'terms_checkbox',
          },
        ],
        metadata: {
          pageType: 'interactive',
          confidence: 0.88,
          interactiveElementCount: 4,
        },
        processingDuration: 1350,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      expect(result.detectedElements).toHaveLength(4);
      expect(result.metadata.interactiveElementCount).toBe(4);

      const interactiveTypes = result.detectedElements.map((e) => e.type);
      expect(interactiveTypes).toContain('link');
      expect(interactiveTypes).toContain('button');
      expect(interactiveTypes).toContain('dropdown');
      expect(interactiveTypes).toContain('checkbox');
    });
  });

  describe('analyzePageLayout', () => {
    it('should analyze complex page layouts', async () => {
      // Arrange
      const screenshotData = 'base64-complex-layout';
      const mockAnalysis = {
        extractedText:
          'Header Navigation Content Sidebar Footer Copyright 2024',
        detectedElements: [
          {
            type: 'header',
            confidence: 0.95,
            bounds: { x: 0, y: 0, width: 1200, height: 80 },
            text: 'page_header',
          },
          {
            type: 'navigation',
            confidence: 0.93,
            bounds: { x: 0, y: 80, width: 200, height: 600 },
            text: 'left_sidebar',
          },
          {
            type: 'content',
            confidence: 0.91,
            bounds: { x: 200, y: 80, width: 800, height: 600 },
            text: 'main_content',
          },
          {
            type: 'sidebar',
            confidence: 0.88,
            bounds: { x: 1000, y: 80, width: 200, height: 600 },
            text: 'right_sidebar',
          },
          {
            type: 'footer',
            confidence: 0.86,
            bounds: { x: 0, y: 680, width: 1200, height: 60 },
            text: 'page_footer',
          },
        ],
        metadata: {
          pageType: 'multi_column',
          confidence: 0.9,
          layoutComplexity: 'high',
        },
        processingDuration: 2100,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(screenshotData);

      // Assert
      expect(result.detectedElements).toHaveLength(5);
      expect(result.metadata.layoutComplexity).toBe('high');

      const layoutElements = [
        'header',
        'navigation',
        'content',
        'sidebar',
        'footer',
      ];
      const detectedTypes = result.detectedElements.map((e) => e.type);

      for (const layoutElement of layoutElements) {
        expect(detectedTypes).toContain(layoutElement);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty screenshot gracefully', async () => {
      // Arrange
      const emptyScreenshot = '';
      mockVisionService.analyzeScreenshot.mockResolvedValue({
        extractedText: '',
        detectedElements: [],
        metadata: {
          pageType: 'unknown',
          confidence: 0,
        },
        processingDuration: 50,
      });

      // Act
      const result = await service.processScreenshot(emptyScreenshot);

      // Assert
      expect(result.extractedText).toBe('');
      expect(result.detectedElements).toHaveLength(0);
      expect(result.metadata.pageType).toBe('unknown');
    });

    it('should handle corrupted image data', async () => {
      // Arrange
      const corruptedData = 'invalid-base64-data-!@#$%';
      mockVisionService.analyzeScreenshot.mockRejectedValue(
        new Error('Invalid image format'),
      );

      // Act & Assert
      await expect(service.processScreenshot(corruptedData)).rejects.toThrow(
        'Invalid image format',
      );
    });

    it('should handle very large screenshots efficiently', async () => {
      // Arrange
      const largeScreenshotData = 'base64-large-screenshot-data'.repeat(1000);
      const mockAnalysis = {
        extractedText: 'Large page content with many elements',
        detectedElements: Array.from({ length: 50 }, (_, i) => ({
          type: 'element',
          confidence: 0.8,
          bounds: { x: i * 10, y: i * 10, width: 100, height: 50 },
          text: `element_${i}`,
        })),
        metadata: {
          pageType: 'complex',
          confidence: 0.75,
        },
        processingDuration: 3500,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const startTime = Date.now();
      const result = await service.processScreenshot(largeScreenshotData);
      const processingTime = Date.now() - startTime;

      // Assert
      expect(result.detectedElements).toHaveLength(50);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle screenshots with no UI elements', async () => {
      // Arrange
      const plainScreenshot = 'base64-plain-text-screenshot';
      const mockAnalysis = {
        extractedText: 'Just plain text content with no interactive elements',
        detectedElements: [
          {
            type: 'text',
            confidence: 0.7,
            bounds: { x: 50, y: 50, width: 500, height: 400 },
            text: 'plain_text_content',
          },
        ],
        metadata: {
          pageType: 'document',
          confidence: 0.65,
        },
        processingDuration: 800,
      };

      mockVisionService.analyzeScreenshot.mockResolvedValue(mockAnalysis);

      // Act
      const result = await service.processScreenshot(plainScreenshot);

      // Assert
      expect(result.extractedText).toContain('plain text content');
      expect(result.detectedElements).toHaveLength(1);
      expect(result.detectedElements[0].type).toBe('text');
      expect(result.metadata.pageType).toBe('document');
    });
  });
});
