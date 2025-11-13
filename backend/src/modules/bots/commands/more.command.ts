import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../../entities/user.entity';
import { SearchService } from '../../search/search.service';
import { SearchResultFormatter } from '../formatters/search-result.formatter';

interface UserSearchSession {
  query: string;
  results: any[];
  offset: number;
  timestamp: Date;
}

/**
 * Command handler for viewing more search results
 * 
 * Allows users to paginate through search results using /more command
 */
@Injectable()
export class MoreCommand {
  private readonly logger = new Logger(MoreCommand.name);
  
  // Store user search sessions in memory
  // In production, use Redis or similar cache
  private searchSessions: Map<string, UserSearchSession> = new Map();
  
  // Session timeout (10 minutes)
  private readonly SESSION_TIMEOUT_MS = 10 * 60 * 1000;

  constructor(
    private readonly searchService: SearchService,
    private readonly searchFormatter: SearchResultFormatter,
  ) {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Execute /more command to show additional search results
   */
  async execute(user: User, platform: 'telegram' | 'whatsapp' = 'telegram'): Promise<string> {
    const session = this.searchSessions.get(user.id);

    if (!session) {
      return this.getNoSessionMessage(platform);
    }

    // Check if session is expired
    const now = new Date();
    const sessionAge = now.getTime() - session.timestamp.getTime();
    
    if (sessionAge > this.SESSION_TIMEOUT_MS) {
      this.searchSessions.delete(user.id);
      return this.getExpiredSessionMessage(platform);
    }

    // Calculate next batch of results
    const nextOffset = session.offset + 5;
    const nextBatch = session.results.slice(nextOffset, nextOffset + 5);

    if (nextBatch.length === 0) {
      return this.getNoMoreResultsMessage(session, platform);
    }

    // Update session offset
    session.offset = nextOffset;
    session.timestamp = now;
    this.searchSessions.set(user.id, session);

    // Format results for the platform
    return this.formatMoreResults(session, nextBatch, platform);
  }

  /**
   * Store search session for a user
   */
  storeSearchSession(userId: string, query: string, results: any[]): void {
    this.searchSessions.set(userId, {
      query,
      results,
      offset: 0, // Initial display shows 0-5, so offset starts at 0
      timestamp: new Date(),
    });

    this.logger.log(`Stored search session for user ${userId}: ${results.length} results`);
  }

  /**
   * Get current search session for a user
   */
  getSearchSession(userId: string): UserSearchSession | null {
    return this.searchSessions.get(userId) || null;
  }

  /**
   * Clear search session for a user
   */
  clearSearchSession(userId: string): void {
    this.searchSessions.delete(userId);
    this.logger.log(`Cleared search session for user ${userId}`);
  }

  /**
   * Format additional results
   */
  private formatMoreResults(
    session: UserSearchSession,
    batch: any[],
    platform: 'telegram' | 'whatsapp',
  ): string {
    const currentIndex = session.offset + 1;
    const endIndex = Math.min(session.offset + batch.length, session.results.length);
    const hasMore = endIndex < session.results.length;

    let response = '';

    if (platform === 'telegram') {
      response += `🔍 <b>More Results</b> (${currentIndex}-${endIndex} of ${session.results.length})\n`;
      response += `Query: "<i>${this.escapeHTML(session.query)}</i>"\n\n`;

      for (const result of batch) {
        response += this.formatSingleResultTelegram(result);
        response += '\n';
      }

      if (hasMore) {
        const remaining = session.results.length - endIndex;
        response += `<i>... ${remaining} more results available</i>\n`;
        response += `💡 Use /more to continue\n`;
      } else {
        response += `✅ <i>End of results</i>\n`;
      }
    } else {
      response += `🔍 *More Results* (${currentIndex}-${endIndex} of ${session.results.length})\n`;
      response += `Query: "_${session.query}_"\n\n`;

      for (const result of batch) {
        response += this.formatSingleResultWhatsApp(result);
        response += '\n';
      }

      if (hasMore) {
        const remaining = session.results.length - endIndex;
        response += `_... ${remaining} more results available_\n`;
        response += `💡 Reply "more" to continue\n`;
      } else {
        response += `✅ _End of results_\n`;
      }
    }

    return response;
  }

  /**
   * Format single result for Telegram
   */
  private formatSingleResultTelegram(result: any): string {
    const date = new Date(result.dump.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const categoryName = result.dump.category?.name || 'Uncategorized';
    const categoryIcon = this.getCategoryIcon(categoryName);
    const relevancePercent = Math.round((result.relevanceScore || 0.5) * 100);

    const contentText = result.dump.ai_summary || result.dump.raw_content;
    const content = contentText?.length > 80 
      ? `${contentText.substring(0, 80)}...`
      : contentText || 'No content available';

    let line = `${categoryIcon} <b>${this.escapeHTML(categoryName)}</b>\n`;
    line += `📅 ${date} • 🎯 ${relevancePercent}%\n`;
    line += `💬 ${this.escapeHTML(content)}\n`;

    if (result.matchType) {
      line += `🔎 <i>${this.getMatchTypeDescription(result.matchType)}</i>\n`;
    }

    return line;
  }

  /**
   * Format single result for WhatsApp
   */
  private formatSingleResultWhatsApp(result: any): string {
    const date = new Date(result.dump.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const categoryName = result.dump.category?.name || 'Uncategorized';
    const categoryIcon = this.getCategoryIcon(categoryName);
    const relevancePercent = Math.round((result.relevanceScore || 0.5) * 100);

    const contentText = result.dump.ai_summary || result.dump.raw_content;
    const content = contentText?.length > 80 
      ? `${contentText.substring(0, 80)}...`
      : contentText || 'No content available';

    let line = `${categoryIcon} *${categoryName}*\n`;
    line += `📅 ${date} • 🎯 ${relevancePercent}%\n`;
    line += `💬 ${content}\n`;

    if (result.matchType) {
      line += `🔎 _${this.getMatchTypeDescription(result.matchType)}_\n`;
    }

    return line;
  }

  /**
   * Get "no session" message
   */
  private getNoSessionMessage(platform: 'telegram' | 'whatsapp'): string {
    if (platform === 'telegram') {
      return (
        `ℹ️ <b>No Active Search</b>\n\n` +
        `You need to perform a search first.\n\n` +
        `Use <code>/search [query]</code> to search your content, ` +
        `then use <code>/more</code> to see additional results.`
      );
    } else {
      return (
        `ℹ️ *No Active Search*\n\n` +
        `You need to perform a search first.\n\n` +
        `Use "search [query]" to search your content, ` +
        `then use "more" to see additional results.`
      );
    }
  }

  /**
   * Get "expired session" message
   */
  private getExpiredSessionMessage(platform: 'telegram' | 'whatsapp'): string {
    if (platform === 'telegram') {
      return (
        `⏰ <b>Search Session Expired</b>\n\n` +
        `Your previous search session has expired (10 min timeout).\n\n` +
        `Please perform a new search with <code>/search [query]</code>.`
      );
    } else {
      return (
        `⏰ *Search Session Expired*\n\n` +
        `Your previous search session has expired (10 min timeout).\n\n` +
        `Please perform a new search with "search [query]".`
      );
    }
  }

  /**
   * Get "no more results" message
   */
  private getNoMoreResultsMessage(
    session: UserSearchSession,
    platform: 'telegram' | 'whatsapp',
  ): string {
    if (platform === 'telegram') {
      return (
        `✅ <b>End of Results</b>\n\n` +
        `You've seen all ${session.results.length} results for "<i>${this.escapeHTML(session.query)}</i>".\n\n` +
        `💡 Try a new search with <code>/search [query]</code>.`
      );
    } else {
      return (
        `✅ *End of Results*\n\n` +
        `You've seen all ${session.results.length} results for "_${session.query}_".\n\n` +
        `💡 Try a new search with "search [query]".`
      );
    }
  }

  /**
   * Clean up expired search sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, session] of this.searchSessions.entries()) {
      const sessionAge = now.getTime() - session.timestamp.getTime();
      
      if (sessionAge > this.SESSION_TIMEOUT_MS) {
        this.searchSessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired search sessions`);
    }
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'Work': '💼',
      'Personal': '👤',
      'Shopping': '🛒',
      'Finance': '💰',
      'Health': '🏥',
      'Travel': '✈️',
      'Learning': '📚',
      'Entertainment': '🎬',
      'Food': '🍽️',
      'Home': '🏠',
      'Uncategorized': '📦',
    };

    return iconMap[categoryName] || '📁';
  }

  /**
   * Get match type description
   */
  private getMatchTypeDescription(matchType: string): string {
    switch (matchType) {
      case 'semantic':
        return 'Semantic match';
      case 'text':
        return 'Text match';
      case 'category':
        return 'Category match';
      default:
        return 'Match found';
    }
  }

  /**
   * Escape HTML for Telegram
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
