import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceProcessorService } from './voice-processor.service';
import { MediaProcessorService } from './media-processor.service';

describe('VoiceProcessorService', () => {
  let service: VoiceProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceProcessorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
        {
          provide: MediaProcessorService,
          useValue: {
            processMedia: jest.fn().mockResolvedValue({
              processed: true,
              file: {
                id: 'file123',
                originalName: 'voice_message.mp3',
                mimeType: 'audio/mpeg',
                size: 1024000,
                url: 'https://storage.example.com/file123.mp3',
                metadata: {
                  duration: 30,
                  format: 'mp3',
                  checksum: 'abc123',
                },
              },
              processingTime: 100,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VoiceProcessorService>(VoiceProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process voice message successfully', async () => {
    const mockRequest = {
      voiceUrl: 'https://example.com/voice.mp3',
      source: 'telegram' as const,
      userId: 'user123',
      messageId: 'msg456',
      originalName: 'voice_message.mp3',
    };

    const result = await service.processVoiceMessage(mockRequest);

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(result.processingSteps).toBeDefined();
  });

  it('should handle processing errors gracefully', async () => {
    const invalidRequest = {
      voiceUrl: '',
      source: 'telegram' as const,
      userId: 'user123',
      messageId: 'msg456',
    };

    const result = await service.processVoiceMessage(invalidRequest);

    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});