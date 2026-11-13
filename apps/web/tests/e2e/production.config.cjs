const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'production-home.spec.cjs',
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true },
  webServer: {
    command: 'pnpm start',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
