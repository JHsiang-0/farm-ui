import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results/playwright/results.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'browser',
      testMatch: '**/browser.spec.js',
      use: { browserName: 'chromium' }
    },
    {
      name: 'electron',
      testMatch: '**/electron.spec.js'
    },
    {
      name: 'electron-dist',
      testMatch: '**/electron-dist.spec.js'
    }
  ],
  webServer: [
    {
      command: 'npm.cmd run dev:mock -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173/login',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'npx.cmd vite --mode desktop-mock --host 127.0.0.1 --port 5176',
      url: 'http://127.0.0.1:5176',
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
})
