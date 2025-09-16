/**
 * Jest configuration for Formula1 Wiki project
 * This configuration sets up Jest for testing our TypeScript React application
 * with proper module resolution and test environment setup
 */

export default {
  // Use jsdom environment for testing React components
  testEnvironment: 'jsdom',
  
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Module file extensions that Jest should recognize
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform TypeScript and JavaScript files using ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Test file patterns - look for files ending in .test or .spec
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Module name mapping for imports (handle @ alias and CSS modules)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  
  // Coverage thresholds - ensure good test coverage
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Ignore these patterns when looking for tests
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // Clear mocks automatically between every test
  clearMocks: true,
  
  // Verbose output for better test debugging
  verbose: true
}