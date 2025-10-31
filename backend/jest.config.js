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
  testTimeout: 30000, // 30 seconds for model loading
  // Handle ES modules from @xenova/transformers
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@xenova/transformers)/)',
  ],
};