const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'hardening.spec.cjs',
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true },
  webServer: {
    command: 'pnpm exec vite --config tests/fixtures/hardening/vite.config.ts',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
