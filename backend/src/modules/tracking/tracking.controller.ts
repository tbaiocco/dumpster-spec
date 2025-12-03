import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrackingService } from './tracking.service';
import { PackageTrackingService } from './package-tracking.service';
import { TrackingType, TrackingStatus } from '../../entities/trackable-item.entity';

@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly packageTrackingService: PackageTrackingService,
  ) {}

  /**
   * Create a new trackable item
   * POST /api/tracking
   */
  @Post()
  async createTrackableItem(
    @Request() req,
    @Body()
    body: {
      dumpId?: string;
      type: TrackingType;
      title: string;
      description?: string;
      expectedEndDate?: string;
      metadata?: Record<string, any>;
      autoReminders?: boolean;
    },
  ) {
    const userId = req.user.userId;

    const item = await this.trackingService.createTrackableItem(
      userId,
      body.dumpId || null,
      {
        type: body.type,
        title: body.title,
        description: body.description,
        expectedEndDate: body.expectedEndDate
          ? new Date(body.expectedEndDate)
          : undefined,
        metadata: body.metadata,
        autoReminders: body.autoReminders ?? true,
      },
    );

    return {
      success: true,
      data: item,
    };
  }

  /**
   * Get all trackable items for the authenticated user
   * GET /api/tracking
   */
  @Get()
  async getUserTrackableItems(
    @Request() req,
    @Query('type') type?: TrackingType,
    @Query('status') status?: TrackingStatus,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const userId = req.user.userId;

    const items = await this.trackingService.getUserTrackableItems(userId, {
      type,
      status,
      activeOnly: activeOnly === 'true',
    });

    return {
      success: true,
      data: items,
      count: items.length,
    };
  }

  /**
   * Get tracking statistics for the authenticated user
   * GET /api/tracking/stats
   */
  @Get('stats')
  async getTrackingStats(@Request() req) {
    const userId = req.user.userId;

    const stats = await this.trackingService.getTrackingStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get a specific trackable item
   * GET /api/tracking/:id
   */
  @Get(':id')
  async getTrackableItem(@Param('id') id: string) {
    const item = await this.trackingService.getTrackableItem(id);

    if (!item) {
      return {
        success: false,
        error: 'Trackable item not found',
      };
    }

    return {
      success: true,
      data: item,
    };
  }

  /**
   * Update tracking status with a new checkpoint
   * PUT /api/tracking/:id/status
   */
  @Put(':id/status')
  async updateTrackingStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      location?: string;
      notes?: string;
      source?: string;
    },
  ) {
    try {
      const item = await this.trackingService.updateTrackingStatus(id, body);

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark item as completed
   * PUT /api/tracking/:id/complete
   */
  @Put(':id/complete')
  async completeTracking(@Param('id') id: string) {
    try {
      const item = await this.trackingService.completeTracking(id);

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a trackable item
   * DELETE /api/tracking/:id
   */
  @Delete(':id')
  async deleteTrackableItem(@Param('id') id: string) {
    try {
      await this.trackingService.deleteTrackableItem(id);

      return {
        success: true,
        message: 'Trackable item deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Track a package by tracking number
   * POST /api/tracking/package
   */
  @Post('package')
  async trackPackage(
    @Request() req,
    @Body()
    body: {
      trackingNumber: string;
      carrier?: string;
      title?: string;
      autoReminders?: boolean;
    },
  ) {
    const userId = req.user.userId;

    try {
      // Get package tracking info
      const trackingInfo =
        await this.packageTrackingService.trackPackage(
          body.trackingNumber,
          body.carrier as any, // Allow string to be converted
        );

      // Create trackable item
      const expectedDeliveryDate = trackingInfo.estimatedDelivery
        ? new Date(trackingInfo.estimatedDelivery)
        : undefined;

      const item = await this.trackingService.createTrackableItem(
        userId,
        null,
        {
          type: TrackingType.PACKAGE,
          title: body.title || `Package ${body.trackingNumber}`,
          description: `Shipped via ${trackingInfo.carrier}`,
          expectedEndDate: expectedDeliveryDate,
          metadata: {
            trackingNumber: body.trackingNumber,
            carrier: trackingInfo.carrier,
          },
          autoReminders: body.autoReminders ?? true,
        },
      );

      // Add current status as checkpoint if available
      if (trackingInfo.status) {
        await this.trackingService.updateTrackingStatus(item.id, {
          status: trackingInfo.status,
          location: trackingInfo.currentLocation,
          notes: `Tracking started. Status: ${trackingInfo.status}`,
          source: trackingInfo.carrier,
        });
      }

      return {
        success: true,
        data: {
          item,
          trackingInfo,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get tracking suggestions for a dump
   * POST /api/tracking/detect
   */
  @Post('detect')
  async detectTrackableItems(
    @Request() req,
    @Body() body: { dumpId: string },
  ) {
    const userId = req.user.userId;

    const result = await this.trackingService.detectTrackableItems(
      userId,
      body.dumpId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
