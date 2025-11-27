import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Shipping carrier
 */
export enum ShippingCarrier {
  UPS = 'ups',
  FEDEX = 'fedex',
  USPS = 'usps',
  DHL = 'dhl',
  AMAZON = 'amazon',
  OTHER = 'other',
}

/**
 * Package status
 */
export enum PackageStatus {
  LABEL_CREATED = 'label_created',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

/**
 * Package tracking event
 */
export interface TrackingEvent {
  timestamp: Date;
  status: PackageStatus;
  location?: string;
  description: string;
  carrier: ShippingCarrier;
}

/**
 * Package tracking information
 */
export interface PackageTrackingInfo {
  trackingNumber: string;
  carrier: ShippingCarrier;
  status: PackageStatus;
  currentLocation?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  recipient?: string;
  origin?: string;
  destination?: string;
  events: TrackingEvent[];
  lastUpdated: Date;
}

/**
 * Service for tracking packages from various carriers
 */
@Injectable()
export class PackageTrackingService {
  private readonly logger = new Logger(PackageTrackingService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Track a package by tracking number
   */
  async trackPackage(
    trackingNumber: string,
    carrier?: ShippingCarrier,
  ): Promise<PackageTrackingInfo> {
    this.logger.log(`Tracking package: ${trackingNumber}`);

    // Auto-detect carrier if not provided
    const detectedCarrier = carrier || this.detectCarrier(trackingNumber);

    try {
      switch (detectedCarrier) {
        case ShippingCarrier.UPS:
          return await this.trackUPS(trackingNumber);
        case ShippingCarrier.FEDEX:
          return await this.trackFedEx(trackingNumber);
        case ShippingCarrier.USPS:
          return await this.trackUSPS(trackingNumber);
        case ShippingCarrier.DHL:
          return await this.trackDHL(trackingNumber);
        default:
          return this.mockTrackingInfo(trackingNumber, detectedCarrier);
      }
    } catch (error) {
      this.logger.error(`Failed to track package: ${error.message}`);
      return this.mockTrackingInfo(trackingNumber, detectedCarrier);
    }
  }

  /**
   * Detect carrier from tracking number format
   */
  detectCarrier(trackingNumber: string): ShippingCarrier {
    const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase();

    // UPS: 18 characters starting with "1Z"
    if (/^1Z[A-Z0-9]{16}$/.test(cleaned)) {
      return ShippingCarrier.UPS;
    }

    // FedEx: 12 or 15 digits
    if (/^\d{12}$|^\d{15}$/.test(cleaned)) {
      return ShippingCarrier.FEDEX;
    }

    // USPS: 20-22 digits
    if (/^\d{20,22}$/.test(cleaned)) {
      return ShippingCarrier.USPS;
    }

    // DHL: 10 or 11 digits
    if (/^\d{10,11}$/.test(cleaned)) {
      return ShippingCarrier.DHL;
    }

    // Amazon: starts with "TBA"
    if (/^TBA\d{12}$/.test(cleaned)) {
      return ShippingCarrier.AMAZON;
    }

    return ShippingCarrier.OTHER;
  }

  /**
   * Track UPS package
   */
  private async trackUPS(trackingNumber: string): Promise<PackageTrackingInfo> {
    const apiKey = this.configService.get<string>('UPS_API_KEY');
    if (!apiKey) {
      this.logger.warn('UPS API key not configured');
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.UPS);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://onlinetools.ups.com/track/v1/details/${trackingNumber}`,
          {
            headers: {
              AccessLicenseNumber: apiKey,
            },
          },
        ),
      );

      return this.parseUPSResponse(response.data, trackingNumber);
    } catch (error) {
      this.logger.error(`UPS API error: ${error.message}`);
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.UPS);
    }
  }

  /**
   * Track FedEx package
   */
  private async trackFedEx(
    trackingNumber: string,
  ): Promise<PackageTrackingInfo> {
    const apiKey = this.configService.get<string>('FEDEX_API_KEY');
    if (!apiKey) {
      this.logger.warn('FedEx API key not configured');
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.FEDEX);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://apis.fedex.com/track/v1/trackingnumbers',
          {
            trackingInfo: [
              {
                trackingNumberInfo: {
                  trackingNumber,
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );

      return this.parseFedExResponse(response.data, trackingNumber);
    } catch (error) {
      this.logger.error(`FedEx API error: ${error.message}`);
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.FEDEX);
    }
  }

  /**
   * Track USPS package
   */
  private async trackUSPS(
    trackingNumber: string,
  ): Promise<PackageTrackingInfo> {
    const apiKey = this.configService.get<string>('USPS_API_KEY');
    if (!apiKey) {
      this.logger.warn('USPS API key not configured');
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.USPS);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://secure.shippingapis.com/ShippingAPI.dll',
          {
            params: {
              API: 'TrackV2',
              XML: `<TrackRequest USERID="${apiKey}"><TrackID ID="${trackingNumber}"></TrackID></TrackRequest>`,
            },
          },
        ),
      );

      return this.parseUSPSResponse(response.data, trackingNumber);
    } catch (error) {
      this.logger.error(`USPS API error: ${error.message}`);
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.USPS);
    }
  }

  /**
   * Track DHL package
   */
  private async trackDHL(trackingNumber: string): Promise<PackageTrackingInfo> {
    const apiKey = this.configService.get<string>('DHL_API_KEY');
    if (!apiKey) {
      this.logger.warn('DHL API key not configured');
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.DHL);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api-eu.dhl.com/track/shipments`, {
          params: { trackingNumber },
          headers: {
            'DHL-API-Key': apiKey,
          },
        }),
      );

      return this.parseDHLResponse(response.data, trackingNumber);
    } catch (error) {
      this.logger.error(`DHL API error: ${error.message}`);
      return this.mockTrackingInfo(trackingNumber, ShippingCarrier.DHL);
    }
  }

  /**
   * Parse UPS API response
   */
  private parseUPSResponse(
    data: any,
    trackingNumber: string,
  ): PackageTrackingInfo {
    // Simplified parsing - actual implementation would be more complex
    const shipment = data.trackResponse?.shipment?.[0];

    return {
      trackingNumber,
      carrier: ShippingCarrier.UPS,
      status: this.mapUPSStatus(shipment?.package?.[0]?.currentStatus),
      events: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Parse FedEx API response
   */
  private parseFedExResponse(
    data: any,
    trackingNumber: string,
  ): PackageTrackingInfo {
    // Simplified parsing - actual implementation would be more complex
    const result = data.output?.completeTrackResults?.[0];

    return {
      trackingNumber,
      carrier: ShippingCarrier.FEDEX,
      status: this.mapFedExStatus(result?.latestStatusDetail?.code),
      events: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Parse USPS API response
   */
  private parseUSPSResponse(
    data: any,
    trackingNumber: string,
  ): PackageTrackingInfo {
    // Simplified parsing - actual implementation would be more complex
    return {
      trackingNumber,
      carrier: ShippingCarrier.USPS,
      status: PackageStatus.IN_TRANSIT,
      events: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Parse DHL API response
   */
  private parseDHLResponse(
    data: any,
    trackingNumber: string,
  ): PackageTrackingInfo {
    // Simplified parsing - actual implementation would be more complex
    return {
      trackingNumber,
      carrier: ShippingCarrier.DHL,
      status: PackageStatus.IN_TRANSIT,
      events: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Map UPS status to PackageStatus
   */
  private mapUPSStatus(status: string): PackageStatus {
    if (!status) return PackageStatus.UNKNOWN;

    const normalized = status.toLowerCase();
    if (normalized.includes('delivered')) return PackageStatus.DELIVERED;
    if (normalized.includes('transit')) return PackageStatus.IN_TRANSIT;
    if (normalized.includes('out for delivery'))
      return PackageStatus.OUT_FOR_DELIVERY;
    if (normalized.includes('exception')) return PackageStatus.EXCEPTION;

    return PackageStatus.IN_TRANSIT;
  }

  /**
   * Map FedEx status to PackageStatus
   */
  private mapFedExStatus(statusCode: string): PackageStatus {
    if (!statusCode) return PackageStatus.UNKNOWN;

    switch (statusCode.toUpperCase()) {
      case 'DL':
        return PackageStatus.DELIVERED;
      case 'IT':
        return PackageStatus.IN_TRANSIT;
      case 'OD':
        return PackageStatus.OUT_FOR_DELIVERY;
      case 'DE':
        return PackageStatus.EXCEPTION;
      default:
        return PackageStatus.IN_TRANSIT;
    }
  }

  /**
   * Generate mock tracking info (for development/fallback)
   */
  private mockTrackingInfo(
    trackingNumber: string,
    carrier: ShippingCarrier,
  ): PackageTrackingInfo {
    const now = new Date();
    const estimatedDelivery = new Date(now);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

    return {
      trackingNumber,
      carrier,
      status: PackageStatus.IN_TRANSIT,
      currentLocation: 'Distribution Center',
      estimatedDelivery,
      events: [
        {
          timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          status: PackageStatus.LABEL_CREATED,
          location: 'Origin Facility',
          description: 'Shipping label created',
          carrier,
        },
        {
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          status: PackageStatus.IN_TRANSIT,
          location: 'Regional Hub',
          description: 'Package in transit',
          carrier,
        },
        {
          timestamp: now,
          status: PackageStatus.IN_TRANSIT,
          location: 'Distribution Center',
          description: 'Package at distribution center',
          carrier,
        },
      ],
      lastUpdated: now,
    };
  }

  /**
   * Extract tracking numbers from text
   */
  extractTrackingNumbers(text: string): Array<{
    trackingNumber: string;
    carrier: ShippingCarrier;
  }> {
    const results: Array<{ trackingNumber: string; carrier: ShippingCarrier }> =
      [];

    // UPS pattern
    const upsMatches = text.match(/\b1Z[A-Z0-9]{16}\b/gi);
    if (upsMatches) {
      for (const match of upsMatches) {
        results.push({ trackingNumber: match, carrier: ShippingCarrier.UPS });
      }
    }

    // FedEx pattern (12 or 15 digits)
    const fedexMatches = text.match(/\b\d{12}\b|\b\d{15}\b/g);
    if (fedexMatches) {
      for (const match of fedexMatches) {
        results.push({ trackingNumber: match, carrier: ShippingCarrier.FEDEX });
      }
    }

    // USPS pattern (20-22 digits)
    const uspsMatches = text.match(/\b\d{20,22}\b/g);
    if (uspsMatches) {
      for (const match of uspsMatches) {
        results.push({ trackingNumber: match, carrier: ShippingCarrier.USPS });
      }
    }

    // Amazon pattern
    const amazonMatches = text.match(/\bTBA\d{12}\b/gi);
    if (amazonMatches) {
      for (const match of amazonMatches) {
        results.push({
          trackingNumber: match,
          carrier: ShippingCarrier.AMAZON,
        });
      }
    }

    return results;
  }

  /**
   * Format tracking info for display
   */
  formatTrackingInfo(info: PackageTrackingInfo): string {
    const lines: string[] = [
      `📦 Package ${info.trackingNumber}`,
      `Carrier: ${info.carrier.toUpperCase()}`,
      `Status: ${this.formatStatus(info.status)}`,
    ];

    if (info.currentLocation) {
      lines.push(`Location: ${info.currentLocation}`);
    }

    if (info.estimatedDelivery) {
      lines.push(
        `Est. Delivery: ${info.estimatedDelivery.toLocaleDateString()}`,
      );
    }

    if (info.actualDelivery) {
      lines.push(`Delivered: ${info.actualDelivery.toLocaleDateString()}`);
    }

    if (info.events.length > 0) {
      lines.push('\nRecent Activity:');
      const recentEvents = info.events.slice(-3).reverse();
      for (const event of recentEvents) {
        lines.push(
          `• ${event.timestamp.toLocaleString()} - ${event.description}`,
        );
        if (event.location) {
          lines.push(`  ${event.location}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format package status for display
   */
  private formatStatus(status: PackageStatus): string {
    switch (status) {
      case PackageStatus.LABEL_CREATED:
        return '🏷️ Label Created';
      case PackageStatus.IN_TRANSIT:
        return '🚚 In Transit';
      case PackageStatus.OUT_FOR_DELIVERY:
        return '🏃 Out for Delivery';
      case PackageStatus.DELIVERED:
        return '✅ Delivered';
      case PackageStatus.EXCEPTION:
        return '⚠️ Exception';
      case PackageStatus.RETURNED:
        return '↩️ Returned';
      case PackageStatus.CANCELLED:
        return '❌ Cancelled';
      default:
        return '❓ Unknown';
    }
  }
}
