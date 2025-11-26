import { Test, TestingModule } from '@nestjs/testing';
import { PackageTrackingService } from '../../../src/modules/tracking/package-tracking.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('PackageTrackingService', () => {
  let service: PackageTrackingService;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'tracking.ups.apiKey': 'test-ups-key',
          'tracking.fedex.apiKey': 'test-fedex-key',
          'tracking.usps.apiKey': 'test-usps-key',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackageTrackingService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PackageTrackingService>(PackageTrackingService);
  });

  describe('trackPackage', () => {
    it('should track UPS package', async () => {
      const trackingNumber = '1Z999AA10123456784';

      const result = await service.trackPackage(trackingNumber);

      expect(result.carrier).toBe('ups');
      expect(result.trackingNumber).toBe(trackingNumber);
      expect(result.status).toBeDefined();
    });

    it('should detect carrier from tracking number', () => {
      const upsNumber = '1Z999AA10123456784';
      const fedexNumber = '123456789012';
      const uspsNumber = '9400111899561514751456';

      expect(service.detectCarrier(upsNumber)).toBe('ups');
      expect(service.detectCarrier(fedexNumber)).toBe('fedex');
      expect(service.detectCarrier(uspsNumber)).toBe('usps');
    });

    it('should handle unknown carrier', async () => {
      const unknownNumber = 'UNKNOWN123';

      // Unknown carrier should return mock tracking info, not throw
      const result = await service.trackPackage(unknownNumber);
      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe(unknownNumber);
    });
  });

  describe('extractTrackingNumbers', () => {
    it('should extract tracking numbers from text', () => {
      const text = 'Your package 1Z999AA10123456784 will arrive soon. Also tracking 9400111899561514751456.';

      const numbers = service.extractTrackingNumbers(text);

      expect(numbers.length).toBeGreaterThan(0);
      expect(numbers[0].trackingNumber).toBe('1Z999AA10123456784');
      expect(numbers[0].carrier).toBe('ups');
    });

    it('should return empty array if no tracking numbers found', () => {
      const text = 'This text has no tracking numbers';

      const numbers = service.extractTrackingNumbers(text);

      expect(numbers).toHaveLength(0);
    });
  });

  describe('formatTrackingInfo', () => {
    it('should format tracking info for user', () => {
      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'ups' as any,
        status: 'out_for_delivery' as any,
        estimatedDelivery: new Date('2025-12-15'),
        currentLocation: 'Local facility',
        events: [],
        lastUpdated: new Date(),
      };

      const formatted = service.formatTrackingInfo(trackingInfo);

      expect(formatted).toContain('UPS');
      expect(formatted).toContain('1Z999AA10123456784');
    });

    it('should handle delivered status', () => {
      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'ups' as any,
        status: 'delivered' as any,
        estimatedDelivery: new Date('2025-12-15'),
        actualDelivery: new Date('2025-12-14'),
        events: [],
        lastUpdated: new Date(),
      };

      const formatted = service.formatTrackingInfo(trackingInfo);

      expect(formatted).toContain('Delivered');
    });
  });

  describe('trackPackage', () => {
    it('should track package and return info', async () => {
      const trackingNumber = '1Z999AA10123456784';

      const result = await service.trackPackage(trackingNumber);

      expect(result.carrier).toBeDefined();
      expect(result.trackingNumber).toBe(trackingNumber);
      expect(result.status).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });
});
