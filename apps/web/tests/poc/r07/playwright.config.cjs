const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'lifecycle.spec.cjs',
  workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', headless: true },
  webServer: {
    command: 'pnpm exec vite tests/poc/r07 --host 127.0.0.1 --port 5177 --strictPort',
    cwd: require('node:path').resolve(__dirname, '../../..'),
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
