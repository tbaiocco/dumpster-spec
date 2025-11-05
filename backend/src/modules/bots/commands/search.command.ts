import { Injectable } from '@nestjs/common';
import { User } from '../../../entities/user.entity';
import { SearchService } from '../../search/search.service';

@Injectable()
export class SearchCommand {
  constructor(private readonly searchService: SearchService) {}

  async execute(user: User, command: string): Promise<string> {
    const commandParts = command.split(' ');
    
    // Extract search query from command (everything after /search)
    const query = commandParts.slice(1).join(' ').trim();

    if (!query) {
      return this.getSearchHelp();
    }

    try {
      // Perform search using the SearchService
      const searchResults = await this.searchService.quickSearch(query, user.id, 10);

      if (!searchResults || searchResults.length === 0) {
        return `🔍 <b>Search Results</b>\n\n` +
               `No results found for "<i>${query}</i>"\n\n` +
               `💡 <b>Tips:</b>\n` +
               `• Try different keywords\n` +
               `• Use broader terms\n` +
               `• Check spelling\n` +
               `• Try searching for content type (e.g., "photos", "messages")`;
      }

      let response = `🔍 <b>Search Results</b> (${searchResults.length} found)\n`;
      response += `Query: "<i>${query}</i>"\n\n`;

      for (const result of searchResults.slice(0, 5)) { // Limit to 5 results for bot display
        const date = new Date(result.dump.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        // Get category info
        const categoryName = result.dump.category?.name || 'Uncategorized';
        const categoryIcon = this.getCategoryIcon(categoryName);

        // Format content preview
        const contentText = result.dump.ai_summary || result.dump.raw_content;
        const content = contentText?.length > 80 
          ? contentText.substring(0, 80) + '...'
          : contentText || 'No content available';

        // Show relevance score
        const relevancePercent = Math.round((result.relevanceScore || 0.5) * 100);

        response += `${categoryIcon} <b>${categoryName}</b>\n`;
        response += `📅 ${date} • 🎯 ${relevancePercent}% relevant\n`;
        response += `💬 ${content}\n`;
        
        if (result.matchType) {
          response += `🔎 <i>${this.getMatchTypeDescription(result.matchType)}</i>\n`;
        }
        
        response += '\n';
      }

      if (searchResults.length > 5) {
        response += `<i>... and ${searchResults.length - 5} more results</i>\n\n`;
      }

      response += `💡 Use more specific terms to narrow your search.`;

      return response;

    } catch (error) {
      console.error('Search command error:', error);
      return `❌ <b>Search Error</b>\n\n` +
             `Sorry, there was an error searching your content. Please try again in a moment.\n\n` +
             `If the problem persists, use /report to let us know.`;
    }
  }

  private getSearchHelp(): string {
    return `🔍 <b>Search Your Content</b>\n\n` +
           `<b>Usage:</b> <code>/search [your query]</code>\n\n` +
           `<b>Examples:</b>\n` +
           `• <code>/search meeting notes</code>\n` +
           `• <code>/search photos from last week</code>\n` +
           `• <code>/search shopping list</code>\n` +
           `• <code>/search voice messages</code>\n\n` +
           `<b>Search Features:</b>\n` +
           `🎯 Semantic matching - finds related content\n` +
           `📝 Text matching - finds exact phrases\n` +
           `📅 Time-based - searches by date ranges\n` +
           `🏷️ Category filtering - by content type\n\n` +
           `💡 <b>Tips:</b>\n` +
           `• Use natural language queries\n` +
           `• Try different keywords if no results\n` +
           `• Search works across all your content`;
  }

  private getCategoryIcon(categoryName?: string): string {
    const iconMap: Record<string, string> = {
      'Personal': '👤',
      'Work': '💼', 
      'Shopping': '🛒',
      'Health': '🏥',
      'Finance': '💰',
      'Travel': '✈️',
      'Entertainment': '🎬',
      'Food': '🍽️',
      'Education': '📚',
      'Technology': '💻',
      'General': '📝',
    };
    
    return iconMap[categoryName || ''] || '📝';
  }

  private getMatchTypeDescription(matchType: string): string {
    const descriptions: Record<string, string> = {
      'semantic': 'Semantic match',
      'fuzzy': 'Similar text match',
      'exact': 'Exact match',
      'partial': 'Partial match',
      'category': 'Category match',
    };
    
    return descriptions[matchType] || 'Match found';
  }
}