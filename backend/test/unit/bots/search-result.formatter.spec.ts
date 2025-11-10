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
          id: 'dump-1',
          raw_content: 'Important meeting notes',
          ai_summary: 'Meeting summary',
          content_type: 'text' as const,
          created_at: new Date('2025-12-01'),
          category: { name: 'Work', icon: '💼' },
          relevance_score: 0.95,
        },
        {
          id: 'dump-2',
          raw_content: 'Grocery list',
          ai_summary: 'Shopping items',
          content_type: 'text' as const,
          created_at: new Date('2025-12-02'),
          category: { name: 'Personal', icon: '🏠' },
          relevance_score: 0.85,
        },
      ];

      const formatted = formatter.formatForTelegram(results, 'test query');

      expect(formatted).toContain('💼 Work');
      expect(formatted).toContain('Meeting summary');
      expect(formatted).toContain('95%');
      expect(formatted).toContain('2 results');
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
          id: 'dump-1',
          raw_content: longContent,
          ai_summary: longContent,
          content_type: 'text' as const,
          created_at: new Date(),
          category: { name: 'Work', icon: '💼' },
          relevance_score: 0.9,
        },
      ];

      const formatted = formatter.formatForTelegram(results, 'test');

      expect(formatted.length).toBeLessThan(4096); // Telegram message limit
      expect(formatted).toContain('...');
    });

    it('should include pagination hint', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        id: `dump-${i}`,
        raw_content: `Content ${i}`,
        ai_summary: `Summary ${i}`,
        content_type: 'text' as const,
        created_at: new Date(),
        category: { name: 'Work', icon: '💼' },
        relevance_score: 0.9,
      }));

      const formatted = formatter.formatForTelegram(results, 'test', true);

      expect(formatted).toContain('/more');
    });
  });

  describe('formatForWhatsApp', () => {
    it('should format search results for WhatsApp', () => {
      const results = [
        {
          id: 'dump-1',
          raw_content: 'Important note',
          ai_summary: 'Note summary',
          content_type: 'text' as const,
          created_at: new Date('2025-12-01'),
          category: { name: 'Work', icon: '💼' },
          relevance_score: 0.95,
        },
      ];

      const formatted = formatter.formatForWhatsApp(results, 'test query');

      expect(formatted).toContain('💼 Work');
      expect(formatted).toContain('Note summary');
      expect(formatted).toBeTruthy();
    });

    it('should use WhatsApp-compatible formatting', () => {
      const results = [
        {
          id: 'dump-1',
          raw_content: 'Test content',
          ai_summary: 'Test summary',
          content_type: 'text' as const,
          created_at: new Date(),
          category: { name: 'Work', icon: '💼' },
          relevance_score: 0.9,
        },
      ];

      const formatted = formatter.formatForWhatsApp(results, 'test');

      // WhatsApp uses *bold* and _italic_ instead of HTML/Markdown
      expect(formatted).toContain('*');
    });
  });

  describe('formatContextual', () => {
    it('should format results with context', () => {
      const results = [
        {
          id: 'dump-1',
          raw_content: 'The quick brown fox jumps over the lazy dog',
          ai_summary: 'Fox story',
          content_type: 'text' as const,
          created_at: new Date(),
          category: { name: 'Stories', icon: '📚' },
          relevance_score: 0.9,
        },
      ];

      const formatted = formatter.formatContextual(results, 'brown fox', 'telegram');

      expect(formatted).toContain('fox');
      expect(formatted).toContain('...'); // Context window markers
    });

    it('should highlight query terms', () => {
      const results = [
        {
          id: 'dump-1',
          raw_content: 'This is a test content with important keywords',
          ai_summary: 'Test content',
          content_type: 'text' as const,
          created_at: new Date(),
          category: { name: 'Test', icon: '🧪' },
          relevance_score: 0.9,
        },
      ];

      const formatted = formatter.formatContextual(results, 'important', 'telegram');

      // Should highlight the matched term
      expect(formatted).toContain('important');
    });
  });

  describe('formatSingleResult', () => {
    it('should format single detailed result', () => {
      const result = {
        id: 'dump-1',
        raw_content: 'Detailed content',
        ai_summary: 'Full summary',
        content_type: 'text' as const,
        created_at: new Date(),
        category: { name: 'Work', icon: '💼' },
        relevance_score: 0.95,
        tags: ['important', 'review'],
      };

      const formatted = formatter.formatSingleResult(result, 'telegram');

      expect(formatted).toContain('Full summary');
      expect(formatted).toContain('important');
      expect(formatted).toContain('review');
    });

    it('should include metadata', () => {
      const result = {
        id: 'dump-1',
        raw_content: 'Content',
        ai_summary: 'Summary',
        content_type: 'image' as const,
        created_at: new Date('2025-12-01T10:00:00Z'),
        category: { name: 'Photos', icon: '📷' },
        relevance_score: 0.9,
        file_url: 'https://example.com/image.jpg',
      };

      const formatted = formatter.formatSingleResult(result, 'telegram');

      expect(formatted).toContain('📷');
      expect(formatted).toContain('image');
    });
  });

  describe('formatRelevanceScore', () => {
    it('should format score as percentage', () => {
      const score = (formatter as any).formatRelevanceScore(0.856);

      expect(score).toBe('86%');
    });

    it('should handle edge cases', () => {
      expect((formatter as any).formatRelevanceScore(0)).toBe('0%');
      expect((formatter as any).formatRelevanceScore(1)).toBe('100%');
      expect((formatter as any).formatRelevanceScore(0.999)).toBe('100%');
    });
  });

  describe('truncateContent', () => {
    it('should truncate long content', () => {
      const longText = 'A'.repeat(500);
      const truncated = (formatter as any).truncateContent(longText, 100);

      expect(truncated.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(truncated).toContain('...');
    });

    it('should not truncate short content', () => {
      const shortText = 'Short text';
      const result = (formatter as any).truncateContent(shortText, 100);

      expect(result).toBe(shortText);
      expect(result).not.toContain('...');
    });
  });
});
