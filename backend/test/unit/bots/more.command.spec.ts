// Mock @xenova/transformers before any imports
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(() =>
    Promise.resolve({
      predict: jest.fn(() => Promise.resolve([1, 2, 3, 4, 5])),
    }),
  ),
  env: {
    backends: {
      onnx: {
        wasm: {
          wasmPaths: '/mock/path/',
        },
      },
    },
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { MoreCommand } from '../../../src/modules/bots/commands/more.command';
import { SearchService } from '../../../src/modules/search/search.service';
import { SearchResultFormatter } from '../../../src/modules/bots/formatters/search-result.formatter';

describe('MoreCommand', () => {
  let command: MoreCommand;

  const mockSearchResults = Array.from({ length: 25 }, (_, i) => ({
    dump: {
      id: `dump-${i}`,
      raw_content: `Content ${i}`,
      ai_summary: `Summary ${i}`,
      content_type: 'text' as const,
      created_at: new Date(),
      category: { name: 'Work', icon: '💼' },
    },
    relevanceScore: 0.9 - i * 0.01,
    matchType: 'semantic' as const,
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
  });

  describe('execute', () => {
    it('should show next page of results', async () => {
      const user = { id: 'user-123', telegram_chat_id: 'chat-456' } as any;

      // Store initial search session
      command.storeSearchSession(user.id, 'test', mockSearchResults);

      const result = await command.execute(user, 'telegram');

      expect(result).toContain('More Results');
      expect(result).toContain('6-10 of 25'); // Next page after initial 5
      expect(result).toContain('test'); // Query
      expect(result).toContain('15 more results available'); // Remaining
    });

    it('should handle no active session', async () => {
      const user = { id: 'user-123' } as any;
      const result = await command.execute(user, 'telegram');

      expect(result).toContain('No Active Search');
      expect(result).toContain('/search [query]');
    });

    it('should support WhatsApp', async () => {
      const user = { id: 'user-123' } as any;

      command.storeSearchSession(user.id, 'test', mockSearchResults);

      const result = await command.execute(user, 'whatsapp');

      expect(result).toContain('*More Results*'); // WhatsApp bold format
      expect(result).toContain('6-10 of 25');
      expect(result).toContain('_... 15 more results available_'); // WhatsApp italic
      expect(result).toContain('Reply "more" to continue');
    });
  });

  describe('storeSearchSession', () => {
    it('should store search session', () => {
      command.storeSearchSession('user-123', 'test query', mockSearchResults);

      const stored = command.getSearchSession('user-123');

      expect(stored).toBeDefined();
      expect(stored?.query).toBe('test query');
      expect(stored?.results).toHaveLength(25);
    });
  });

  describe('getSearchSession', () => {
    it('should retrieve active session', () => {
      command.storeSearchSession('user-123', 'test', mockSearchResults);

      const session = command.getSearchSession('user-123');

      expect(session).toBeDefined();
      expect(session?.query).toBe('test');
    });

    it('should return null for nonexistent session', () => {
      const session = command.getSearchSession('nonexistent-user');

      expect(session).toBeNull();
    });
  });

  describe('clearSearchSession', () => {
    it('should clear search session', () => {
      command.storeSearchSession('user-123', 'test', mockSearchResults);

      command.clearSearchSession('user-123');

      const session = command.getSearchSession('user-123');

      expect(session).toBeNull();
    });
  });
});
