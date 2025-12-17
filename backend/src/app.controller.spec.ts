import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseInitService } from './database/database-init.service';
import { QueryEnhancementService } from './modules/search/query-enhancement.service';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockDatabaseInitService = {
      recreateVectorIndex: jest.fn(),
      getIndexInfo: jest.fn(),
      getVectorHealthStatus: jest.fn(),
      ensureVectorIndex: jest.fn(),
    };

    const mockQueryEnhancementService = {
      enhanceQuery: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseInitService,
          useValue: mockDatabaseInitService,
        },
        {
          provide: QueryEnhancementService,
          useValue: mockQueryEnhancementService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
