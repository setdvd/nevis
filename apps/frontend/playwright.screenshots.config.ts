import { defineConfig } from '@playwright/test'

import base from './playwright.config'

// pnpm screenshots: the README pictures in docs/screenshots, from the same
// production build and real API as the browser tests
export default defineConfig({
    ...base,
    testMatch: '**/*.shot.ts',
    reporter: 'list',
    use: { ...base.use, reducedMotion: 'reduce' },
})
