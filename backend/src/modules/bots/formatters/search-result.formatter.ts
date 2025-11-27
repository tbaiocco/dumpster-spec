import { Injectable } from '@nestjs/common';

export interface SearchResult {
  dump: {
    id: string;
    raw_content: string;
    ai_summary?: string;
    content_type: string;
    created_at: Date;
    category?: {
      name: string;
      icon?: string;
    };
  };
  relevanceScore: number;
  matchType?: 'semantic' | 'text' | 'category' | 'metadata';
  excerpt?: string;
  highlights?: string[];
}

/**
 * Formatter for search results in bot conversations
 *
 * Provides consistent, user-friendly formatting of search results
 * for Telegram and WhatsApp bots.
 */
@Injectable()
export class SearchResultFormatter {
  /**
   * Format search results for Telegram (HTML)
   */
  formatForTelegram(
    results: SearchResult[],
    query: string,
    options: {
      maxResults?: number;
      showScore?: boolean;
      showMatchType?: boolean;
    } = {},
  ): string {
    const { maxResults = 5, showScore = true, showMatchType = true } = options;

    if (results.length === 0) {
      return this.formatNoResults(query, 'telegram');
    }

    const displayResults = results.slice(0, maxResults);
    const hasMore = results.length > maxResults;

    let response = `🔍 <b>Search Results</b> (${results.length} found)\n`;
    response += `Query: "<i>${this.escapeHTML(query)}</i>"\n\n`;

    for (const result of displayResults) {
      response += this.formatSingleResultTelegram(result, {
        showScore,
        showMatchType,
      });
      response += '\n';
    }

    if (hasMore) {
      response += `<i>... and ${results.length - maxResults} more results</i>\n`;
      response += `💡 Use /more to see additional results\n\n`;
    }

    response += this.getSearchTips();

    return response;
  }

  /**
   * Format search results for WhatsApp (plain text with emojis)
   */
  formatForWhatsApp(
    results: SearchResult[],
    query: string,
    options: {
      maxResults?: number;
      showScore?: boolean;
      showMatchType?: boolean;
    } = {},
  ): string {
    const { maxResults = 5, showScore = true, showMatchType = true } = options;

    if (results.length === 0) {
      return this.formatNoResults(query, 'whatsapp');
    }

    const displayResults = results.slice(0, maxResults);
    const hasMore = results.length > maxResults;

    let response = `🔍 *Search Results* (${results.length} found)\n`;
    response += `Query: "_${query}_"\n\n`;

    for (const result of displayResults) {
      response += this.formatSingleResultWhatsApp(result, {
        showScore,
        showMatchType,
      });
      response += '\n';
    }

    if (hasMore) {
      response += `_... and ${results.length - maxResults} more results_\n`;
      response += `💡 Reply with "more" to see additional results\n\n`;
    }

    response += this.getSearchTips();

    return response;
  }

  /**
   * Format a single search result for Telegram
   */
  private formatSingleResultTelegram(
    result: SearchResult,
    options: { showScore: boolean; showMatchType: boolean },
  ): string {
    const date = new Date(result.dump.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const categoryName = result.dump.category?.name || 'Uncategorized';
    const categoryIcon = this.getCategoryIcon(categoryName);

    // Get content preview
    const content = this.getContentPreview(result, 120);

    let line = `${categoryIcon} <b>${this.escapeHTML(categoryName)}</b>\n`;
    line += `📅 ${date}`;

    if (options.showScore) {
      const relevancePercent = Math.round(result.relevanceScore * 100);
      line += ` • 🎯 ${relevancePercent}%`;
    }

    line += '\n';

    // Show highlighted excerpt if available
    if (result.excerpt) {
      line += `💬 ${this.escapeHTML(result.excerpt)}\n`;
    } else {
      line += `💬 ${this.escapeHTML(content)}\n`;
    }

    // Show match type
    if (options.showMatchType && result.matchType) {
      line += `🔎 <i>${this.getMatchTypeDescription(result.matchType)}</i>\n`;
    }

    // Show highlights if available
    if (result.highlights && result.highlights.length > 0) {
      const highlight = result.highlights[0];
      line += `✨ "<i>${this.escapeHTML(highlight)}</i>"\n`;
    }

    return line;
  }

  /**
   * Format a single search result for WhatsApp
   */
  private formatSingleResultWhatsApp(
    result: SearchResult,
    options: { showScore: boolean; showMatchType: boolean },
  ): string {
    const date = new Date(result.dump.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const categoryName = result.dump.category?.name || 'Uncategorized';
    const categoryIcon = this.getCategoryIcon(categoryName);

    // Get content preview
    const content = this.getContentPreview(result, 120);

    let line = `${categoryIcon} *${categoryName}*\n`;
    line += `📅 ${date}`;

    if (options.showScore) {
      const relevancePercent = Math.round(result.relevanceScore * 100);
      line += ` • 🎯 ${relevancePercent}%`;
    }

    line += '\n';

    // Show highlighted excerpt if available
    if (result.excerpt) {
      line += `💬 ${result.excerpt}\n`;
    } else {
      line += `💬 ${content}\n`;
    }

    // Show match type
    if (options.showMatchType && result.matchType) {
      line += `🔎 _${this.getMatchTypeDescription(result.matchType)}_\n`;
    }

    // Show highlights if available
    if (result.highlights && result.highlights.length > 0) {
      const highlight = result.highlights[0];
      line += `✨ "_${highlight}_"\n`;
    }

    return line;
  }

  /**
   * Format "no results" message
   */
  private formatNoResults(
    query: string,
    platform: 'telegram' | 'whatsapp',
  ): string {
    if (platform === 'telegram') {
      return (
        `🔍 <b>Search Results</b>\n\n` +
        `No results found for "<i>${this.escapeHTML(query)}</i>"\n\n` +
        `💡 <b>Try:</b>\n` +
        `• Different keywords\n` +
        `• Broader terms\n` +
        `• Check spelling\n` +
        `• Search by category (e.g., "photos", "messages")`
      );
    } else {
      return (
        `🔍 *Search Results*\n\n` +
        `No results found for "_${query}_"\n\n` +
        `💡 *Try:*\n` +
        `• Different keywords\n` +
        `• Broader terms\n` +
        `• Check spelling\n` +
        `• Search by category (e.g., "photos", "messages")`
      );
    }
  }

  /**
   * Get content preview with appropriate length
   */
  private getContentPreview(result: SearchResult, maxLength: number): string {
    const contentText = result.dump.ai_summary || result.dump.raw_content;

    if (!contentText) {
      return 'No content available';
    }

    if (contentText.length <= maxLength) {
      return contentText;
    }

    return `${contentText.substring(0, maxLength)}...`;
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      Work: '💼',
      Personal: '👤',
      Shopping: '🛒',
      Finance: '💰',
      Health: '🏥',
      Travel: '✈️',
      Learning: '📚',
      Entertainment: '🎬',
      Food: '🍽️',
      Home: '🏠',
      Social: '👥',
      Ideas: '💡',
      Photos: '📷',
      Documents: '📄',
      Voice: '🎤',
      Uncategorized: '📦',
    };

    return iconMap[categoryName] || '📁';
  }

  /**
   * Get match type description
   */
  private getMatchTypeDescription(matchType: string): string {
    switch (matchType) {
      case 'semantic':
        return 'Semantic match - related content';
      case 'text':
        return 'Text match - exact phrase';
      case 'category':
        return 'Category match';
      case 'metadata':
        return 'Metadata match';
      default:
        return 'Content match';
    }
  }

  /**
   * Get search tips
   */
  private getSearchTips(): string {
    return `💡 Use more specific terms to narrow your search.`;
  }

  /**
   * Escape HTML special characters for Telegram
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format search results summary
   */
  formatSummary(results: SearchResult[], query: string): string {
    if (results.length === 0) {
      return `No results found for "${query}"`;
    }

    const categories = new Set(
      results.map((r) => r.dump.category?.name || 'Uncategorized'),
    );

    return `Found ${results.length} results for "${query}" across ${categories.size} categories`;
  }

  /**
   * Format contextual search results (for digests/reminders)
   */
  formatContextual(
    results: SearchResult[],
    context: string,
    maxResults = 3,
  ): string {
    if (results.length === 0) {
      return '';
    }

    const displayResults = results.slice(0, maxResults);

    let response = `\n📚 <b>Related Content</b> (${context}):\n`;

    for (const result of displayResults) {
      const preview = this.getContentPreview(result, 60);
      const date = new Date(result.dump.created_at).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
        },
      );

      response += `• ${this.escapeHTML(preview)} (${date})\n`;
    }

    if (results.length > maxResults) {
      response += `<i>... and ${results.length - maxResults} more related items</i>\n`;
    }

    return response;
  }
}
