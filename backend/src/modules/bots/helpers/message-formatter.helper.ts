import { DumpProcessingResult } from '../../dumps/services/dump.service';

/**
 * Shared message formatting utilities for bot platforms (Telegram, WhatsApp)
 * Provides consistent formatting across different messaging platforms
 */
export class MessageFormatterHelper {
  /**
   * Format processing result for user-friendly display
   * Shows summary, urgency, and action items in a structured format
   */
  static formatProcessingResult(result: DumpProcessingResult): string {
    const { dump } = result;
    const entities = dump.extracted_entities;

    let content = '';

    // Summary
    if (dump.ai_summary) {
      content += `📝 Summary: ${dump.ai_summary}\n\n`;
    }

    // Extract structured data for beautiful display
    let urgency = 'low';
    let actionItems: string[] = [];

    if (entities) {
      urgency = entities.urgency || 'low';
      actionItems = entities.actionItems || [];
    }

    // Show urgency if not low
    if (urgency !== 'low') {
      const urgencyEmoji = urgency === 'high' ? '🔴' : '🟡';
      content += `${urgencyEmoji} Urgency: ${urgency.charAt(0).toUpperCase() + urgency.slice(1)}\n\n`;
    }

    // Show action items if any
    if (actionItems.length > 0) {
      content += `✅ Action Items:\n`;
      const itemsToShow = actionItems.slice(0, 3);
      for (const [index, item] of itemsToShow.entries()) {
        content += `${index + 1}. ${item}\n`;
      }
      if (actionItems.length > 3) {
        content += `... and ${actionItems.length - 3} more\n`;
      }
      content += '\n';
    }

    return content.length > 3500 ? content.substring(0, 3500) + '...' : content;
  }

  /**
   * Build formatted response message with title, content, category, and confidence
   * Returns the plain text message without platform-specific formatting
   * Platform-specific formatting (HTML/Markdown) should be applied by the caller
   */
  static buildFormattedResponse(
    title: string,
    content: string,
    category?: string,
    confidence?: number,
  ): string {
    let text = `✅ ${title}\n\n`;
    text += `${content}\n\n`;

    if (category) {
      text += `📁 Category: ${category}\n`;
    }

    if (confidence !== undefined) {
      const confidencePercent = Math.round(confidence * 100);
      text += `🎯 Confidence: ${confidencePercent}%\n`;
    }

    text += `\n_Your content has been saved!_`;

    return text;
  }

  /**
   * Apply HTML formatting for Telegram
   * Telegram uses HTML tags for formatting
   */
  static applyHtmlFormatting(text: string): string {
    return text
      .replaceAll('Summary:', '<b>Summary:</b>')
      .replaceAll('Urgency:', '<b>Urgency:</b>')
      .replaceAll('Action Items:', '<b>Action Items:</b>')
      .replaceAll('Category:', '<b>Category:</b>')
      .replaceAll('Confidence:', '<b>Confidence:</b>')
      .replaceAll(/✅ (.+?)\n\n/g, '✅ <b>$1</b>\n\n')
      .replaceAll(/_(.+?)_/g, '<i>$1</i>');
  }

  /**
   * Apply Markdown formatting for WhatsApp
   * WhatsApp uses markdown-like syntax for formatting
   */
  static applyMarkdownFormatting(text: string): string {
    return text
      .replaceAll('Summary:', '*Summary:*')
      .replaceAll('Urgency:', '*Urgency:*')
      .replaceAll('Action Items:', '*Action Items:*')
      .replaceAll('Category:', '*Category:*')
      .replaceAll('Confidence:', '*Confidence:*')
      .replaceAll(/✅ (.+?)\n\n/g, '✅ *$1*\n\n');
  }
}
