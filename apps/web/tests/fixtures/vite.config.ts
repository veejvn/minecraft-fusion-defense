import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
});
