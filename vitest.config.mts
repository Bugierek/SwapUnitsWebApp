import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// `npm test` runs the suites in src/**/__tests__. They test plain library code (parser, unit
// factors), so they run in Node: no browser environment (jsdom) is needed or installed.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    dir: 'src',
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
