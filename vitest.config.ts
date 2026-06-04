import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    // Global test configuration
    globals: true,
    environment: 'node',
    setupFiles: ['./packages/testing/src/setup.ts'],

    // Test file patterns
    include: [
      'packages/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'tests/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '**/*.d.ts',
      'packages/**/node_modules/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'packages/**/*.ts',
        'packages/**/*.tsx',
        'packages/**/*.js',
        'packages/**/*.jsx',
      ],
      exclude: [
        'packages/**/*.d.ts',
        'packages/**/*.test.{ts,tsx,js,jsx}',
        'packages/**/*.spec.{ts,tsx,js,jsx}',
        'packages/**/dist/**',
        'packages/**/node_modules/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Watch mode
    watch: false,

    // Isolate tests
    isolate: true,

    // Reporter configuration
    reporters: ['default', 'junit'],

    // Output file for JUnit reporter
    outputFile: {
      junit: 'test-results/junit.xml',
    },
  },

  // Resolve configuration for monorepo
  resolve: {
    alias: {
      // Package aliases for easier imports
      '@frontal-labs/ai': resolve(__dirname, 'packages/ai/src'),
      '@frontal-labs/functions': resolve(__dirname, 'packages/functions/src'),
      '@frontal-labs/blob': resolve(__dirname, 'packages/blob/src'),
      '@frontal-labs/agents': resolve(__dirname, 'packages/agents/src'),
      '@frontal-labs/core': resolve(__dirname, 'packages/core/src'),
      '@frontal-labs/graph': resolve(__dirname, 'packages/graph/src'),
      '@frontal-labs/ontology': resolve(__dirname, 'packages/ontology/src'),
      '@frontal-labs/pipelines': resolve(__dirname, 'packages/pipelines/src'),
      '@frontal-labs/workflows': resolve(__dirname, 'packages/workflows/src'),
      '@frontal-labs/testing': resolve(__dirname, 'packages/testing/src'),
      '@frontal-labs/types': resolve(__dirname, 'types'),
    },
  },

  // Define constants for tests
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
