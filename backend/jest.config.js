module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000, // 10 second timeout for database operations
};