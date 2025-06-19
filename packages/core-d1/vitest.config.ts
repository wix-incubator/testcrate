import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@core$/, replacement: path.resolve(__dirname, '../core/src') },
      { find: /^@core\/(.*)$/, replacement: path.resolve(__dirname, '../core/src/$1') },
      { find: /^@core-d1$/, replacement: path.resolve(__dirname, 'src') },
      { find: /^@core-d1\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
