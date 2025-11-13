// Global test setup
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Mock external services by default
jest.mock('../src/modules/ai/claude.service');
jest.mock('../src/modules/ai/speech.service');
jest.mock('../src/modules/ai/vision.service');

// Global test database configuration
export const testDatabaseConfig = {
  type: 'postgres' as const,
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  username: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASS || 'test',
  database: process.env.TEST_DB_NAME || 'dumpster_test',
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  synchronize: true,
  dropSchema: true, // Clean database for each test run
};

// Helper function to create test module
export async function createTestingModule(imports: any[] = [], providers: any[] = []) {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot(testDatabaseConfig),
      ...imports,
    ],
    providers: [...providers],
  }).compile();
}