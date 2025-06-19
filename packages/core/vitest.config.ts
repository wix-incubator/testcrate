import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@core$/, replacement: path.resolve(__dirname, 'src') },
      { find: /^@core\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
