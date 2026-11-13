import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [{
      find: /^@mfd\/game$/,
      replacement: fileURLToPath(new URL('./fake-game.ts', import.meta.url)),
    }],
  },
  server: { host: '127.0.0.1', port: 5183, strictPort: true },
});
