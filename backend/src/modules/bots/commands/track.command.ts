import { Injectable, Logger } from '@nestjs/common';
import { TrackingService } from '../../tracking/tracking.service';
import { PackageTrackingService } from '../../tracking/package-tracking.service';
import { User } from '../../../entities/user.entity';
import {
  TrackingType,
  TrackingStatus,
} from '../../../entities/trackable-item.entity';

@Injectable()
export class TrackCommand {
  private readonly logger = new Logger(TrackCommand.name);

  constructor(
    private readonly trackingService: TrackingService,
    private readonly packageTrackingService: PackageTrackingService,
  ) {}

  async execute(
    user: User,
    args: string[],
    platform: 'telegram' | 'whatsapp' = 'telegram',
  ): Promise<string> {
    try {
      // If no args, show user's active tracked items
      if (args.length === 0 || args[0] === 'list') {
        return await this.listTrackedItems(user, platform);
      }

      // If args[0] is a tracking number, track it
      const trackingNumber = args[0];
      return await this.trackPackage(user, trackingNumber, platform);
    } catch (error) {
      this.logger.error(
        `Error executing track command: ${error.message}`,
        error.stack,
      );
      return platform === 'whatsapp'
        ? '❌ *Error*\n\nFailed to process tracking command.'
        : '❌ <b>Error</b>\n\nFailed to process tracking command.';
    }
  }

  private async listTrackedItems(
    user: User,
    platform: 'telegram' | 'whatsapp',
  ): Promise<string> {
    const items = await this.trackingService.getUserTrackableItems(user.id, {
      activeOnly: true,
    });

    if (items.length === 0) {
      if (platform === 'whatsapp') {
        return (
          '📦 *Tracked Items*\n\n' +
          'You have no active tracked items.\n\n' +
          '_Use `/track <tracking-number>` to track a package_'
        );
      }

      return (
        '📦 <b>Tracked Items</b>\n\n' +
        'You have no active tracked items.\n\n' +
        '<i>Use /track &lt;tracking-number&gt; to track a package</i>'
      );
    }

    const headerText =
      platform === 'whatsapp'
        ? `📦 *Tracked Items (${items.length})*\n\n`
        : `📦 <b>Tracked Items (${items.length})</b>\n\n`;

    let response = headerText;

    for (const item of items) {
      const icon = this.getTrackingIcon(item.type);
      const statusIcon = this.getStatusIcon(item.status);

      response += `━━━━━━━━━━━━━━━━━━\n`;
      response += `${icon} ${platform === 'whatsapp' ? `*${item.title}*` : `<b>${item.title}</b>`}\n`;
      response += `${statusIcon} Status: ${item.status.replace('_', ' ')}\n`;

      if (item.expected_end_date) {
        const daysRemaining = Math.ceil(
          (new Date(item.expected_end_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysRemaining > 0) {
          response += `📅 Expected: ${daysRemaining} days\n`;
        } else if (daysRemaining === 0) {
          response += `📅 Expected: Today\n`;
        } else {
          response += `⚠️  Overdue by ${Math.abs(daysRemaining)} days\n`;
        }
      }

      // Show latest checkpoint
      if (item.checkpoints.length > 0) {
        const latest = item.checkpoints[item.checkpoints.length - 1];
        response += `📍 Latest: ${latest.status}\n`;
        if (latest.location) {
          response += `   ${latest.location}\n`;
        }
      }

      response += `\n`;
    }

    return response;
  }

  private async trackPackage(
    user: User,
    trackingNumber: string,
    platform: 'telegram' | 'whatsapp',
  ): Promise<string> {
    try {
      // Try to get tracking info
      const trackingInfo =
        await this.packageTrackingService.trackPackage(trackingNumber);

      // Create trackable item
      const expectedDate = trackingInfo.estimatedDelivery
        ? new Date(trackingInfo.estimatedDelivery)
        : undefined;

      const item = await this.trackingService.createTrackableItem(
        user.id,
        null,
        {
          type: TrackingType.PACKAGE,
          title: `Package ${trackingNumber}`,
          description: `Shipped via ${trackingInfo.carrier}`,
          expectedEndDate: expectedDate,
          metadata: {
            trackingNumber,
            carrier: trackingInfo.carrier,
          },
          autoReminders: true,
        },
      );

      // Add current status
      if (trackingInfo.status) {
        await this.trackingService.updateTrackingStatus(item.id, {
          status: trackingInfo.status,
          location: trackingInfo.currentLocation,
          notes: `Initial tracking status`,
          source: trackingInfo.carrier,
        });
      }

      const successMessage =
        platform === 'whatsapp'
          ? `✅ *Package Tracked*\n\n📦 ${trackingNumber}\n🚚 ${trackingInfo.carrier}\n📍 ${trackingInfo.status}`
          : `✅ <b>Package Tracked</b>\n\n📦 ${trackingNumber}\n🚚 ${trackingInfo.carrier}\n📍 ${trackingInfo.status}`;

      return expectedDate
        ? `${successMessage}\n📅 Expected: ${expectedDate.toLocaleDateString()}`
        : successMessage;
    } catch (error) {
      this.logger.warn(
        `Failed to track package ${trackingNumber}: ${error.message}`,
      );
      return platform === 'whatsapp'
        ? `❌ *Tracking Failed*\n\nCouldn't track ${trackingNumber}.\n\n_Make sure the tracking number is correct._`
        : `❌ <b>Tracking Failed</b>\n\nCouldn't track ${trackingNumber}.\n\n<i>Make sure the tracking number is correct.</i>`;
    }
  }

  private getTrackingIcon(type: TrackingType): string {
    const icons = {
      [TrackingType.PACKAGE]: '📦',
      [TrackingType.APPLICATION]: '📝',
      [TrackingType.SUBSCRIPTION]: '🔄',
      [TrackingType.WARRANTY]: '🛡️',
      [TrackingType.LOAN]: '💰',
      [TrackingType.INSURANCE]: '🏥',
      [TrackingType.OTHER]: '📋',
    };
    return icons[type] || '📋';
  }

  private getStatusIcon(status: TrackingStatus): string {
    const icons = {
      [TrackingStatus.PENDING]: '⏳',
      [TrackingStatus.IN_PROGRESS]: '🚚',
      [TrackingStatus.COMPLETED]: '✅',
      [TrackingStatus.EXPIRED]: '❌',
      [TrackingStatus.CANCELLED]: '🚫',
    };
    return icons[status] || '📋';
  }
}
