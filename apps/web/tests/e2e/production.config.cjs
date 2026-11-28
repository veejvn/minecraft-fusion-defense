const { defineConfig } = require('@playwright/test');
const path = require('node:path');

const port = process.env.MFD_PROD_TEST_PORT || '3100';
const baseURL = `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'production-home.spec.cjs',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true, baseURL },
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    cwd: path.resolve(__dirname, '../..'),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
