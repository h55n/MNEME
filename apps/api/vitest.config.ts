import { defineConfig } from 'vitest/config';

process.env.ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'abcdefghijklmnopqrstuvwxyz123456';

export default defineConfig({
    test: {
          environment: 'node',
          globals: true,
          include: ['src/**/*.test.ts'],
          coverage: {
                  provider: 'v8',
                  reporter: ['text', 'lcov'],
                  include: ['src/**/*.ts'],
                  exclude: ['src/**/*.test.ts', 'src/index.ts'],
          },
    },
});
