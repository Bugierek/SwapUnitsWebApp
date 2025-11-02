import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    dir: 'src',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
