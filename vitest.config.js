import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      enabled: true,
      include: ['**/*.ts'],
      provider: 'v8',
      exclude: ['**/*.spec.ts', 'src/index.ts'],
    },
    provide: {
      config: {
        CLOUDFLARE_API_TOKEN: 'test-token',
        CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      },
    },
    setupFiles: ['./vitest.setup.js'],
  },
})
