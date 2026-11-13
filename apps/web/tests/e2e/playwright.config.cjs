const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'phaser-host.spec.cjs',
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  webServer: {
    command: 'pnpm exec vite --config tests/fixtures/vite.config.ts',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
