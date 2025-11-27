import { Injectable, Logger } from '@nestjs/common';
import { DumpService } from '../../dumps/services/dump.service';
import { User } from '../../../entities/user.entity';

@Injectable()
export class RecentCommand {
  private readonly logger = new Logger(RecentCommand.name);

  constructor(private readonly dumpService: DumpService) {}

  async execute(user: User, limit: number = 5): Promise<string> {
    try {
      this.logger.log(
        `Getting recent dumps for user ${user.id}, limit: ${limit}`,
      );

      const recentDumps = await this.dumpService.getRecentByUser(
        user.id,
        limit,
      );

      if (recentDumps.length === 0) {
        return (
          '📋 <b>Recent Content</b>\n\n' +
          "You haven't shared any content yet.\n\n" +
          '<i>Send me a message, photo, or voice note to get started!</i>'
        );
      }

      let response = `📋 <b>Recent Content (${recentDumps.length} items)</b>\n\n`;

      for (const dump of recentDumps) {
        const date = new Date(dump.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Get category icon
        const categoryIcon = this.getCategoryIcon(dump.category?.name);

        // Truncate content for display (use ai_summary if available, otherwise raw_content)
        const contentText = dump.ai_summary || dump.raw_content;
        const content =
          contentText?.length > 50
            ? contentText.substring(0, 50) + '...'
            : contentText || 'No content available';

        response += `${categoryIcon} <b>${dump.category?.name || 'Uncategorized'}</b>\n`;
        response += `📅 ${date}\n`;
        response += `💬 ${content}\n`;

        if (dump.processing_status === 'failed') {
          response += `⚠️ <i>Processing failed</i>\n`;
        } else if (dump.processing_status === 'processing') {
          response += `🔍 <i>Processing...</i>\n`;
        }

        response += '\n';
      }

      response += '<i>Use /search to find specific content</i>';
      return response;
    } catch (error) {
      this.logger.error(
        `Error getting recent dumps: ${error.message}`,
        error.stack,
      );
      return (
        '❌ <b>Error</b>\n\n' +
        "Sorry, I couldn't retrieve your recent content right now.\n\n" +
        '<i>Please try again in a moment.</i>'
      );
    }
  }

  private getCategoryIcon(categoryName?: string): string {
    const icons: Record<string, string> = {
      bill: '📄',
      reminder: '⏰',
      tracking: '📦',
      idea: '💡',
      task: '✓',
      information: 'ℹ️',
      social: '👥',
    };

    return icons[categoryName?.toLowerCase() || ''] || '📝';
  }
}
