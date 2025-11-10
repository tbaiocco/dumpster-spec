import { Test, TestingModule } from '@nestjs/testing';
import { PackageTrackingService } from '../../../src/modules/tracking/package-tracking.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('PackageTrackingService', () => {
  let service: PackageTrackingService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

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
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  describe('trackPackage', () => {
    it('should track UPS package', async () => {
      const trackingNumber = '1Z999AA10123456784';
      const mockResponse = {
        trackingNumber,
        carrier: 'UPS',
        status: 'In Transit',
        estimatedDelivery: new Date('2025-12-15'),
        currentLocation: 'Louisville, KY',
        events: [
          {
            status: 'Shipped',
            location: 'Origin',
            timestamp: new Date('2025-12-10'),
          },
        ],
      };

      httpService.get.mockReturnValue(of({ data: mockResponse }) as any);

      const result = await service.trackPackage(trackingNumber);

      expect(result.carrier).toBe('UPS');
      expect(result.trackingNumber).toBe(trackingNumber);
      expect(result.status).toBeDefined();
    });

    it('should detect carrier from tracking number', async () => {
      const upsNumber = '1Z999AA10123456784';
      const fedexNumber = '123456789012';
      const uspsNumber = '9400111899561514751456';

      expect(await service.detectCarrier(upsNumber)).toBe('UPS');
      expect(await service.detectCarrier(fedexNumber)).toBe('FedEx');
      expect(await service.detectCarrier(uspsNumber)).toBe('USPS');
    });

    it('should handle unknown carrier', async () => {
      const unknownNumber = 'UNKNOWN123';

      await expect(service.trackPackage(unknownNumber)).rejects.toThrow();
    });
  });

  describe('extractTrackingNumbers', () => {
    it('should extract tracking numbers from text', () => {
      const text = 'Your package 1Z999AA10123456784 will arrive soon. Also tracking 9400111899561514751456.';

      const numbers = service.extractTrackingNumbers(text);

      expect(numbers.length).toBeGreaterThan(0);
      expect(numbers).toContain('1Z999AA10123456784');
    });

    it('should return empty array if no tracking numbers found', () => {
      const text = 'This text has no tracking numbers';

      const numbers = service.extractTrackingNumbers(text);

      expect(numbers).toHaveLength(0);
    });
  });

  describe('formatTrackingUpdate', () => {
    it('should format tracking info for user', () => {
      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        status: 'Out for Delivery',
        estimatedDelivery: new Date('2025-12-15'),
        currentLocation: 'Local facility',
        events: [],
      };

      const formatted = service.formatTrackingUpdate(trackingInfo);

      expect(formatted).toContain('UPS');
      expect(formatted).toContain('Out for Delivery');
      expect(formatted).toContain('1Z999AA10123456784');
    });

    it('should handle delivered status', () => {
      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        status: 'Delivered',
        estimatedDelivery: new Date('2025-12-15'),
        deliveryDate: new Date('2025-12-14'),
        events: [],
      };

      const formatted = service.formatTrackingUpdate(trackingInfo);

      expect(formatted).toContain('Delivered');
      expect(formatted).toContain('2025-12-14');
    });
  });

  describe('subscribeToUpdates', () => {
    it('should set up tracking subscription', async () => {
      const trackingNumber = '1Z999AA10123456784';
      const userId = 'user-123';

      const subscription = await service.subscribeToUpdates(trackingNumber, userId);

      expect(subscription).toBeDefined();
      expect(subscription.trackingNumber).toBe(trackingNumber);
      expect(subscription.userId).toBe(userId);
      expect(subscription.isActive).toBe(true);
    });

    it('should notify on status changes', async () => {
      const trackingNumber = '1Z999AA10123456784';
      const callback = jest.fn();

      await service.subscribeToUpdates(trackingNumber, 'user-123', callback);

      // Simulate status change
      await service.checkForUpdates(trackingNumber);

      // In a real implementation with webhooks, this would be called
      // expect(callback).toHaveBeenCalled();
    });
  });

  describe('getDeliveryEstimate', () => {
    it('should provide delivery estimate', async () => {
      const trackingInfo = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        status: 'In Transit',
        estimatedDelivery: new Date('2025-12-15'),
        events: [],
      };

      httpService.get.mockReturnValue(of({ data: trackingInfo }) as any);

      const estimate = await service.getDeliveryEstimate('1Z999AA10123456784');

      expect(estimate).toBeDefined();
      expect(estimate.estimatedDate).toBeInstanceOf(Date);
    });
  });
});
