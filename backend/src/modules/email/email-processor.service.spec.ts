import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailProcessorService } from './email-processor.service';
import { DocumentProcessorService } from '../ai/document-processor.service';

describe('EmailProcessorService', () => {
  let service: EmailProcessorService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockDocumentProcessor: jest.Mocked<DocumentProcessorService>;

  beforeEach(async () => {
    const mockConfigServiceFactory = {
      get: jest.fn(),
    };

    const mockDocumentProcessorFactory = {
      processDocument: jest.fn(),
      extractEntities: jest.fn(),
      validateDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessorService,
        {
          provide: ConfigService,
          useValue: mockConfigServiceFactory,
        },
        {
          provide: DocumentProcessorService,
          useValue: mockDocumentProcessorFactory,
        },
      ],
    }).compile();

    service = module.get<EmailProcessorService>(EmailProcessorService);
    mockConfigService = module.get(ConfigService);
    mockDocumentProcessor = module.get(DocumentProcessorService);
  });

  describe('processEmail', () => {
    it('should process email with plain text body successfully', async () => {
      // Arrange
      const emailMessage = {
        id: 'email-123',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Email Subject',
        textBody: 'This is a test email message body.',
        htmlBody: undefined,
        attachments: [],
        receivedDate: new Date('2024-01-15T10:00:00Z'),
        headers: {
          'Message-ID': '<test@example.com>',
          'Date': 'Mon, 15 Jan 2024 10:00:00 +0000',
        },
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.originalMessage).toEqual(emailMessage);
      expect(result.extractedText).toContain('Subject: Test Email Subject');
      expect(result.extractedText).toContain('This is a test email message body.');
      expect(result.processedAttachments).toHaveLength(0);
      expect(result.metadata.sender).toBe('sender@example.com');
      expect(result.metadata.hasAttachments).toBe(false);
      expect(result.metadata.attachmentCount).toBe(0);
    });

    it('should process email with HTML body when no plain text available', async () => {
      // Arrange
      const emailMessage = {
        id: 'email-456',
        from: 'sender@company.com',
        to: ['recipient@example.com'],
        cc: ['cc@example.com'],
        subject: 'HTML Email',
        textBody: undefined,
        htmlBody: '<html><body><h1>Welcome!</h1><p>This is an <strong>HTML</strong> email.</p></body></html>',
        attachments: [],
        receivedDate: new Date('2024-01-15T11:30:00Z'),
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.originalMessage).toEqual(emailMessage);
      expect(result.extractedText).toContain('Subject: HTML Email');
      expect(result.extractedText).toContain('Welcome!');
      expect(result.extractedText).toContain('This is an HTML email.');
      expect(result.extractedText).not.toContain('<html>');
      expect(result.extractedText).not.toContain('<strong>');
    });

    it('should process email with text attachments', async () => {
      // Arrange
      const textAttachment = {
        filename: 'notes.txt',
        contentType: 'text/plain',
        size: 1024,
        content: Buffer.from('These are some important notes.'),
        disposition: 'attachment' as const,
      };

      const emailMessage = {
        id: 'email-789',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Email with Attachment',
        textBody: 'Please see attached file.',
        htmlBody: null,
        attachments: [textAttachment],
        receivedDate: new Date('2024-01-15T14:00:00Z'),
        headers: {},
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].originalFilename).toBe('notes.txt');
      expect(result.processedAttachments[0].contentType).toBe('text/plain');
      expect(result.processedAttachments[0].processingStatus).toBe('success');
      expect(result.processedAttachments[0].extractedText).toContain('These are some important notes.');
      expect(result.metadata.hasAttachments).toBe(true);
      expect(result.metadata.attachmentCount).toBe(1);
    });

    it('should process email with document attachments using DocumentProcessor', async () => {
      // Arrange
      const pdfAttachment = {
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 5120,
        content: Buffer.from('fake-pdf-content'),
        disposition: 'attachment' as const,
      };

      const emailMessage = {
        id: 'email-pdf',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'PDF Document',
        textBody: 'Please review the attached PDF.',
        htmlBody: null,
        attachments: [pdfAttachment],
        receivedDate: new Date('2024-01-15T16:00:00Z'),
        headers: {},
      };

      const mockDocumentResult = {
        extractedText: 'Extracted text from PDF document',
        confidence: 0.95,
        entities: [],
        metadata: {
          pages: 2,
          language: 'en',
        },
      };

      mockDocumentProcessor.processDocument.mockResolvedValue(mockDocumentResult);

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].originalFilename).toBe('document.pdf');
      expect(result.processedAttachments[0].processingStatus).toBe('success');
      expect(result.processedAttachments[0].extractedText).toBe('Extracted text from PDF document');
      expect(mockDocumentProcessor.processDocument).toHaveBeenCalledWith(
        pdfAttachment.content,
        pdfAttachment.contentType,
      );
    });

    it('should process email with multiple attachments of different types', async () => {
      // Arrange
      const textAttachment = {
        filename: 'readme.txt',
        contentType: 'text/plain',
        size: 512,
        content: Buffer.from('This is a readme file.'),
        disposition: 'attachment' as const,
      };

      const imageAttachment = {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
        size: 2048,
        content: Buffer.from('fake-image-data'),
        disposition: 'attachment' as const,
      };

      const docAttachment = {
        filename: 'report.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 8192,
        content: Buffer.from('fake-docx-content'),
        disposition: 'attachment' as const,
      };

      const emailMessage = {
        id: 'email-multi',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Multiple Attachments',
        textBody: 'Email with various attachments.',
        htmlBody: null,
        attachments: [textAttachment, imageAttachment, docAttachment],
        receivedDate: new Date('2024-01-15T18:00:00Z'),
        headers: {},
      };

      const mockDocumentResult = {
        extractedText: 'Content from Word document',
        confidence: 0.88,
        entities: [],
        metadata: {},
      };

      mockDocumentProcessor.processDocument.mockResolvedValue(mockDocumentResult);

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.processedAttachments).toHaveLength(3);
      expect(result.metadata.attachmentCount).toBe(3);
      expect(result.metadata.hasAttachments).toBe(true);

      // Text attachment should be processed successfully
      const textResult = result.processedAttachments.find(a => a.originalFilename === 'readme.txt');
      expect(textResult.processingStatus).toBe('success');
      expect(textResult.extractedText).toContain('This is a readme file.');

      // Image attachment should be skipped (not supported)
      const imageResult = result.processedAttachments.find(a => a.originalFilename === 'image.jpg');
      expect(imageResult.processingStatus).toBe('skipped');

      // Document should be processed via DocumentProcessor
      const docResult = result.processedAttachments.find(a => a.originalFilename === 'report.docx');
      expect(docResult.processingStatus).toBe('success');
      expect(docResult.extractedText).toBe('Content from Word document');
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      const problemAttachment = {
        filename: 'corrupted.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('corrupted-data'),
        disposition: 'attachment' as const,
      };

      const emailMessage = {
        id: 'email-error',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Problematic Email',
        textBody: 'This email has a corrupted attachment.',
        htmlBody: null,
        attachments: [problemAttachment],
        receivedDate: new Date('2024-01-15T20:00:00Z'),
        headers: {},
      };

      mockDocumentProcessor.processDocument.mockRejectedValue(new Error('Document processing failed'));

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].processingStatus).toBe('failed');
      expect(result.processedAttachments[0].error).toBe('Document processing failed');
      expect(result.metadata.hasAttachments).toBe(true);
      expect(result.metadata.attachmentCount).toBe(1);
    });

    it('should generate correct metadata for high priority emails', async () => {
      // Arrange
      const emailMessage = {
        id: 'email-priority',
        from: 'urgent@example.com',
        to: ['recipient@example.com'],
        subject: 'URGENT: Action Required',
        textBody: 'This is an urgent message that requires immediate attention.',
        htmlBody: null,
        attachments: [],
        receivedDate: new Date('2024-01-15T22:00:00Z'),
        headers: {
          'X-Priority': '1',
          'Importance': 'High',
        },
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.metadata.sender).toBe('urgent@example.com');
      expect(result.metadata.timestamp).toEqual(emailMessage.receivedDate);
      expect(result.metadata.priority).toBe('high');
      expect(result.metadata.hasAttachments).toBe(false);
      expect(result.metadata.attachmentCount).toBe(0);
    });

    it('should handle emails with inline attachments', async () => {
      // Arrange
      const inlineAttachment = {
        filename: 'logo.png',
        contentType: 'image/png',
        size: 1536,
        content: Buffer.from('fake-logo-data'),
        contentId: 'logo@example.com',
        disposition: 'inline' as const,
      };

      const emailMessage = {
        id: 'email-inline',
        from: 'marketing@example.com',
        to: ['recipient@example.com'],
        subject: 'Newsletter with Images',
        textBody: null,
        htmlBody: '<html><body><img src="cid:logo@example.com" alt="Logo"></body></html>',
        attachments: [inlineAttachment],
        receivedDate: new Date('2024-01-15T23:00:00Z'),
        headers: {},
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.processedAttachments).toHaveLength(1);
      expect(result.processedAttachments[0].originalFilename).toBe('logo.png');
      expect(result.metadata.hasAttachments).toBe(true);
      expect(result.metadata.attachmentCount).toBe(1);
    });

    it('should handle emails with no subject or body', async () => {
      // Arrange
      const emailMessage = {
        id: 'email-empty',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: '',
        textBody: '',
        htmlBody: null,
        attachments: [],
        receivedDate: new Date('2024-01-16T00:00:00Z'),
        headers: {},
      };

      // Act
      const result = await service.processEmail(emailMessage);

      // Assert
      expect(result.extractedText).toBe('');
      expect(result.processedAttachments).toHaveLength(0);
      expect(result.metadata.sender).toBe('sender@example.com');
    });
  });

  describe('error handling', () => {
    it('should throw error when email processing fails completely', async () => {
      // Arrange
      const invalidEmail = null;

      // Act & Assert
      await expect(service.processEmail(invalidEmail as any)).rejects.toThrow('Email processing failed');
    });
  });

  describe('metadata generation', () => {
    it('should correctly detect email priority from headers', async () => {
      const priorityTests = [
        { headers: { 'X-Priority': '1' }, expected: 'high' },
        { headers: { 'X-Priority': '3' }, expected: 'normal' },
        { headers: { 'X-Priority': '5' }, expected: 'low' },
        { headers: { 'Importance': 'High' }, expected: 'high' },
        { headers: { 'Importance': 'Low' }, expected: 'low' },
        { headers: {}, expected: 'normal' },
      ];

      for (const test of priorityTests) {
        const emailMessage = {
          id: `email-priority-${Math.random()}`,
          from: 'test@example.com',
          to: ['recipient@example.com'],
          subject: 'Priority Test',
          textBody: 'Test message',
          htmlBody: null,
          attachments: [],
          receivedDate: new Date(),
          headers: test.headers,
        };

        const result = await service.processEmail(emailMessage);
        expect(result.metadata.priority).toBe(test.expected);
      }
    });
  });
});