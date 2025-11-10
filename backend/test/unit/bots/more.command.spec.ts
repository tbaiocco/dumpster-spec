import { Test, TestingModule } from '@nestjs/testing';
import { MoreCommand } from '../../../src/modules/bots/commands/more.command';
import { SearchService } from '../../../src/modules/search/search.service';
import { SearchResultFormatter } from '../../../src/modules/bots/formatters/search-result.formatter';

describe('MoreCommand', () => {
  let command: MoreCommand;
  let searchService: jest.Mocked<SearchService>;
  let formatter: jest.Mocked<SearchResultFormatter>;

  const mockSearchResults = Array.from({ length: 25 }, (_, i) => ({
    id: `dump-${i}`,
    raw_content: `Content ${i}`,
    ai_summary: `Summary ${i}`,
    content_type: 'text' as const,
    created_at: new Date(),
    category: { name: 'Work', icon: '💼' },
    relevance_score: 0.9 - i * 0.01,
  }));

  beforeEach(async () => {
    const mockSearchService = {
      searchDumps: jest.fn(),
    };

    const mockFormatter = {
      formatForTelegram: jest.fn(),
      formatForWhatsApp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoreCommand,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: SearchResultFormatter,
          useValue: mockFormatter,
        },
      ],
    }).compile();

    command = module.get<MoreCommand>(MoreCommand);
    searchService = module.get(SearchService);
    formatter = module.get(SearchResultFormatter);
  });

  describe('execute', () => {
    it('should show next page of results', async () => {
      const userId = 'user-123';
      const chatId = 'chat-456';

      // Store initial search session
      await command.storeSearchSession(userId, chatId, {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram',
      });

      formatter.formatForTelegram.mockReturnValue('Formatted results');

      const result = await command.execute(userId, chatId, 'telegram');

      expect(result).toContain('Formatted results');
      expect(formatter.formatForTelegram).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'dump-10' }),
        ]),
        'test',
        true,
      );
    });

    it('should handle no active session', async () => {
      const result = await command.execute('user-123', 'chat-456', 'telegram');

      expect(result).toContain('No active search');
    });

    it('should handle last page', async () => {
      const userId = 'user-123';
      const chatId = 'chat-456';

      // Store session with only 15 results (2 pages)
      const smallResults = mockSearchResults.slice(0, 15);
      await command.storeSearchSession(userId, chatId, {
        query: 'test',
        results: smallResults,
        currentPage: 1, // Already on second page
        platform: 'telegram',
      });

      const result = await command.execute(userId, chatId, 'telegram');

      expect(result).toContain('No more results');
    });

    it('should support WhatsApp', async () => {
      const userId = 'user-123';
      const chatId = 'chat-456';

      await command.storeSearchSession(userId, chatId, {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'whatsapp',
      });

      formatter.formatForWhatsApp.mockReturnValue('WhatsApp formatted');

      const result = await command.execute(userId, chatId, 'whatsapp');

      expect(formatter.formatForWhatsApp).toHaveBeenCalled();
      expect(result).toBe('WhatsApp formatted');
    });
  });

  describe('storeSearchSession', () => {
    it('should store search session', async () => {
      const session = {
        query: 'test query',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram' as const,
      };

      await command.storeSearchSession('user-123', 'chat-456', session);

      const stored = await command.getSearchSession('user-123', 'chat-456');

      expect(stored).toBeDefined();
      expect(stored?.query).toBe('test query');
      expect(stored?.results).toHaveLength(25);
    });

    it('should auto-expire after 10 minutes', async () => {
      jest.useFakeTimers();

      await command.storeSearchSession('user-123', 'chat-456', {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram',
      });

      // Fast-forward 11 minutes
      jest.advanceTimersByTime(11 * 60 * 1000);

      const session = await command.getSearchSession('user-123', 'chat-456');

      expect(session).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe('getSearchSession', () => {
    it('should retrieve active session', async () => {
      await command.storeSearchSession('user-123', 'chat-456', {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram',
      });

      const session = await command.getSearchSession('user-123', 'chat-456');

      expect(session).toBeDefined();
      expect(session?.query).toBe('test');
    });

    it('should return undefined for nonexistent session', async () => {
      const session = await command.getSearchSession('user-123', 'nonexistent');

      expect(session).toBeUndefined();
    });
  });

  describe('clearSearchSession', () => {
    it('should clear search session', async () => {
      await command.storeSearchSession('user-123', 'chat-456', {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram',
      });

      await command.clearSearchSession('user-123', 'chat-456');

      const session = await command.getSearchSession('user-123', 'chat-456');

      expect(session).toBeUndefined();
    });
  });

  describe('pagination', () => {
    it('should paginate with 10 results per page', async () => {
      await command.storeSearchSession('user-123', 'chat-456', {
        query: 'test',
        results: mockSearchResults,
        currentPage: 0,
        platform: 'telegram',
      });

      formatter.formatForTelegram.mockReturnValue('Page 1');

      await command.execute('user-123', 'chat-456', 'telegram');

      expect(formatter.formatForTelegram).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'dump-10' }),
          expect.objectContaining({ id: 'dump-19' }),
        ]),
        expect.any(String),
        true,
      );
    });

    it('should show page indicator', async () => {
      await command.storeSearchSession('user-123', 'chat-456', {
        query: 'test',
        results: mockSearchResults,
        currentPage: 1,
        platform: 'telegram',
      });

      formatter.formatForTelegram.mockImplementation((results, query, hasMore) => {
        return `Page 2 of 3`;
      });

      const result = await command.execute('user-123', 'chat-456', 'telegram');

      expect(result).toContain('2');
    });
  });
});
