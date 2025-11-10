import { Test, TestingModule } from '@nestjs/testing';
import { SearchResultFormatter } from '../../../src/modules/bots/formatters/search-result.formatter';

describe('SearchResultFormatter', () => {
  let formatter: SearchResultFormatter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchResultFormatter],
    }).compile();

    formatter = module.get<SearchResultFormatter>(SearchResultFormatter);
  });

  describe('formatForTelegram', () => {
    it('should format search results for Telegram', () => {
      const results = [
        {
          dump: {
            id: 'dump-1',
            raw_content: 'Important meeting notes',
            ai_summary: 'Meeting summary',
            content_type: 'text' as const,
            created_at: new Date('2025-12-01'),
            category: { name: 'Work', icon: '💼' },
          },
          relevanceScore: 0.95,
          matchType: 'semantic' as const,
        },
        {
          dump: {
            id: 'dump-2',
            raw_content: 'Grocery list',
            ai_summary: 'Shopping items',
            content_type: 'text' as const,
            created_at: new Date('2025-12-02'),
            category: { name: 'Personal', icon: '🏠' },
          },
          relevanceScore: 0.85,
          matchType: 'text' as const,
        },
      ];

      const formatted = formatter.formatForTelegram(results, 'test query');

      expect(formatted).toContain('Work');
      expect(formatted).toContain('Meeting summary');
      expect(formatted).toContain('95%');
      expect(formatted).toContain('2 found');
    });

    it('should handle empty results', () => {
      const formatted = formatter.formatForTelegram([], 'test query');

      expect(formatted).toContain('No results found');
      expect(formatted).toContain('test query');
    });

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(500);
      const results = [
        {
          dump: {
            id: 'dump-1',
            raw_content: longContent,
            ai_summary: longContent,
            content_type: 'text' as const,
            created_at: new Date(),
            category: { name: 'Work', icon: '💼' },
          },
          relevanceScore: 0.9,
          matchType: 'semantic' as const,
        },
      ];

      const formatted = formatter.formatForTelegram(results, 'test');

      expect(formatted.length).toBeLessThan(4096); // Telegram message limit
      expect(formatted).toContain('...');
    });

    it('should include pagination hint', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        dump: {
          id: `dump-${i}`,
          raw_content: `Content ${i}`,
          ai_summary: `Summary ${i}`,
          content_type: 'text' as const,
          created_at: new Date(),
          category: { name: 'Work', icon: '💼' },
        },
        relevanceScore: 0.9,
        matchType: 'semantic' as const,
      }));

      const formatted = formatter.formatForTelegram(results, 'test');

      expect(formatted).toContain('/more');
    });
  });

  describe('formatForWhatsApp', () => {
    it('should format search results for WhatsApp', () => {
      const results = [
        {
          dump: {
            id: 'dump-1',
            raw_content: 'Important note',
            ai_summary: 'Note summary',
            content_type: 'text' as const,
            created_at: new Date('2025-12-01'),
            category: { name: 'Work', icon: '💼' },
          },
          relevanceScore: 0.95,
          matchType: 'semantic' as const,
        },
      ];

      const formatted = formatter.formatForWhatsApp(results, 'test query');

      expect(formatted).toContain('*Work*');
      expect(formatted).toContain('Note summary');
      expect(formatted).toBeTruthy();
    });

    it('should use WhatsApp-compatible formatting', () => {
      const results = [
        {
          dump: {
            id: 'dump-1',
            raw_content: 'Test content',
            ai_summary: 'Test summary',
            content_type: 'text' as const,
            created_at: new Date(),
            category: { name: 'Work', icon: '💼' },
          },
          relevanceScore: 0.9,
          matchType: 'semantic' as const,
        },
      ];

      const formatted = formatter.formatForWhatsApp(results, 'test');

      // WhatsApp uses *bold* and _italic_ instead of HTML/Markdown
      expect(formatted).toContain('*');
    });
  });
});
