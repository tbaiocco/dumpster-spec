import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../../entities/user.entity';
import {
  FeedbackService,
  FeedbackType,
} from '../../../modules/feedback/feedback.service';

@Injectable()
export class ReportCommand {
  private readonly logger = new Logger(ReportCommand.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  async execute(
    user: User,
    commandText?: string,
    platform: 'telegram' | 'whatsapp' = 'telegram',
  ): Promise<string> {
    try {
      // Parse the command to extract report details
      const reportText = this.extractReportText(commandText);

      this.logger.log(
        `User ${user.id} submitting report: ${reportText || 'No specific text'}`,
      );

      // Determine feedback type based on content or provide options
      if (!reportText || reportText.trim().length === 0) {
        return this.showReportOptions(platform);
      }

      // Submit feedback using the FeedbackService
      const feedbackId = await this.feedbackService.submitFeedback({
        userId: user.id,
        type: this.determineFeedbackType(reportText),
        title: this.generateTitle(reportText),
        description: reportText,
        additionalContext: {
          source: 'telegram_bot',
          userPhone: user.phone_number,
          chatPlatform: 'telegram',
        },
      });

      if (platform === 'whatsapp') {
        let response = '✅ *Report Submitted Successfully*\n\n';
        response += `Report ID: ${feedbackId}\n\n`;
        response += `Your feedback: "${reportText}"\n\n`;
        response +=
          '🙏 Thank you for helping us improve! Our team will review your report and take appropriate action.\n\n';
        response += '_You can reference this report using the ID above._';
        return response;
      }

      let response = '✅ <b>Report Submitted Successfully</b>\n\n';
      response += `Report ID: <code>${feedbackId}</code>\n\n`;
      response += `Your feedback: "${reportText}"\n\n`;
      response +=
        '🙏 Thank you for helping us improve! Our team will review your report and take appropriate action.\n\n';
      response += '<i>You can reference this report using the ID above.</i>';

      return response;
    } catch (error) {
      this.logger.error(
        `Error processing report: ${error.message}`,
        error.stack,
      );

      if (platform === 'whatsapp') {
        return (
          '❌ *Report Submission Failed*\n\n' +
          "Sorry, we couldn't process your report right now.\n\n" +
          '_Please try again later or contact support directly._'
        );
      }

      return (
        '❌ <b>Report Submission Failed</b>\n\n' +
        "Sorry, we couldn't process your report right now.\n\n" +
        '<i>Please try again later or contact support directly.</i>'
      );
    }
  }

  private extractReportText(commandText?: string): string {
    if (!commandText) return '';

    // Remove the /report command and get the rest of the text
    const parts = commandText.split(' ');
    if (parts.length > 1) {
      return parts.slice(1).join(' ').trim();
    }

    return '';
  }

  private showReportOptions(platform: 'telegram' | 'whatsapp' = 'telegram'): string {
    if (platform === 'whatsapp') {
      let response = '🚨 *Report an Issue*\n\n';
      response += 'To report an issue, use:\n';
      response += '/report [your message]\n\n';
      response += '*Examples:*\n';
      response += '• /report The bot is not saving my voice messages\n';
      response += '• /report Wrong category detected for my receipt\n';
      response += '• /report App is running slowly\n\n';
      response += "_Please describe the issue you're experiencing._";
      return response;
    }

    let response = '🚨 <b>Report an Issue</b>\n\n';
    response += 'To report an issue, use:\n';
    response += '<code>/report [your message]</code>\n\n';
    response += '<b>Examples:</b>\n';
    response +=
      '• <code>/report The bot is not saving my voice messages</code>\n';
    response +=
      '• <code>/report Wrong category detected for my receipt</code>\n';
    response += '• <code>/report App is running slowly</code>\n\n';
    response += "<i>Please describe the issue you're experiencing.</i>";

    return response;
  }

  private determineFeedbackType(reportText: string): FeedbackType {
    const text = reportText.toLowerCase();

    if (
      text.includes('bug') ||
      text.includes('error') ||
      text.includes('not working') ||
      text.includes('broken')
    ) {
      return FeedbackType.BUG_REPORT;
    }

    if (text.includes('category') || text.includes('wrong category')) {
      return FeedbackType.CATEGORIZATION_ERROR;
    }

    if (text.includes('summary') || text.includes('wrong summary')) {
      return FeedbackType.SUMMARY_ERROR;
    }

    if (
      text.includes('slow') ||
      text.includes('performance') ||
      text.includes('loading')
    ) {
      return FeedbackType.PERFORMANCE_ISSUE;
    }

    if (
      text.includes('ai') ||
      text.includes('analysis') ||
      text.includes('detection')
    ) {
      return FeedbackType.AI_ERROR;
    }

    if (
      text.includes('feature') ||
      text.includes('suggest') ||
      text.includes('would like')
    ) {
      return FeedbackType.FEATURE_REQUEST;
    }

    // Default to general feedback
    return FeedbackType.GENERAL_FEEDBACK;
  }

  private generateTitle(reportText: string): string {
    const maxLength = 60;

    if (reportText.length <= maxLength) {
      return reportText;
    }

    // Try to cut at a word boundary
    const truncated = reportText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 20) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }
}
