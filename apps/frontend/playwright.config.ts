import { defineConfig, devices } from '@playwright/test'

const WEB_URL = 'http://localhost:4173'

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.e2e.ts',
    forbidOnly: process.env['CI'] !== undefined,
    retries: 0,
    reporter: 'list',
    use: { baseURL: WEB_URL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            name: 'api',
            command: 'pnpm --filter @nevis/backend start',
            url: 'http://localhost:8787/clients',
            reuseExistingServer: false,
        },
        {
            name: 'web',
            command: 'pnpm build && pnpm preview',
            url: WEB_URL,
            reuseExistingServer: false,
        },
    ],
})
