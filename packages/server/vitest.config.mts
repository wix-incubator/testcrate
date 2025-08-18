import path from 'node:path';

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  resolve: {
    alias: [
      { find: /^@auth$/, replacement: path.resolve(__dirname, '../auth/src') },
      { find: /^@auth\/(.*)$/, replacement: path.resolve(__dirname, '../auth/src/$1') },
      { find: /^@core$/, replacement: path.resolve(__dirname, '../core/src') },
      { find: /^@core\/(.*)$/, replacement: path.resolve(__dirname, '../core/src/$1') },
      { find: /^@database-d1$/, replacement: path.resolve(__dirname, '../database-d1/src') },
      { find: /^@database-d1\/(.*)$/, replacement: path.resolve(__dirname, '../database-d1/src/$1') },
      { find: /^@eventstore$/, replacement: path.resolve(__dirname, '../eventstore/src') },
      { find: /^@eventstore\/(.*)$/, replacement: path.resolve(__dirname, '../eventstore/src/$1') },
      { find: /^@eventstore-d1$/, replacement: path.resolve(__dirname, '../eventstore-d1/src') },
      { find: /^@eventstore-d1\/(.*)$/, replacement: path.resolve(__dirname, '../eventstore-d1/src/$1') },
      { find: /^@server$/, replacement: path.resolve(__dirname, 'src') },
      { find: /^@server\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
      },
    },
  },
});
