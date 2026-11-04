import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

// Performance budgets (PLAN.md section 10) on the production build and the
// real API. CPU throttled 4x in Chromium as a stand-in for a mid-range phone.

const CPU_SLOWDOWN = 4

type Vitals = {
    lcp: number
    cls: number
    events: { duration: number; start: number }[]
}

// collects LCP, layout shifts and interaction timings from the first paint on
const observeVitals = (page: Page) =>
    page.addInitScript(() => {
        const vitals: Vitals = { lcp: 0, cls: 0, events: [] }
        Object.assign(window, { __vitals: vitals })
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                vitals.lcp = entry.startTime
            }
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // cast: TS's DOM types have no LayoutShift entry yet
                const shift = entry as PerformanceEntry & {
                    value: number
                    hadRecentInput: boolean
                }
                if (!shift.hadRecentInput) {
                    vitals.cls += shift.value
                }
            }
        }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                vitals.events.push({
                    duration: entry.duration,
                    start: entry.startTime,
                })
            }
            // cast: durationThreshold (Event Timing) is missing in TS's DOM types
        }).observe({
            type: 'event',
            durationThreshold: 16,
            buffered: true,
        } as PerformanceObserverInit)
    })

// cast: the page stored it on window in observeVitals
const readVitals = (page: Page): Promise<Vitals> =>
    page.evaluate(() => (window as unknown as { __vitals: Vitals }).__vitals)

const throttleCpu = async (page: Page) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })
}

const now = (page: Page) => page.evaluate(() => performance.now())

const row = (page: Page, name: string) =>
    page
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name, exact: true }) })

test.describe('performance', () => {
    test('all JS loads up front and stays under 200 kB gzip', () => {
        const html = readFileSync('dist/index.html', 'utf8')
        const initial = [
            ...html.matchAll(
                /<script[^>]+src="\/([^"]+\.js)"|<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g
            ),
        ].map((match) => match[1] ?? match[2] ?? '')
        const built = readdirSync('dist/assets')
            .filter((file) => file.endsWith('.js'))
            .map((file) => `assets/${file}`)
        const gzipKb = (file: string) =>
            gzipSync(readFileSync(`dist/${file}`)).length / 1024
        const initialKb = initial.reduce((sum, file) => sum + gzipKb(file), 0)

        console.log(`initial JS ${initialKb.toFixed(1)} kB gzip`)
        // no lazy chunk: the chart is drawn with the table, nothing comes later
        expect([...built].sort()).toEqual([...initial].sort())
        expect(initialKb).toBeLessThan(200)
    })

    test('load: LCP under 2.5 s and no layout shift', async ({ page }) => {
        await observeVitals(page)
        await throttleCpu(page)
        await page.goto('/')
        await expect(page.getByRole('treegrid')).toBeVisible()
        await expect(
            page
                .getByRole('region', { name: 'Clients chart' })
                .locator('svg text')
                .first()
        ).toBeVisible()
        await page.waitForTimeout(500)

        const { lcp, cls } = await readVitals(page)
        console.log(`LCP ${lcp.toFixed(0)} ms, CLS ${cls.toFixed(4)}`)
        expect(lcp).toBeLessThan(2500)
        expect(cls).toBeLessThan(0.1)
    })

    test('every interaction paints within 200 ms (INP budget)', async ({
        page,
    }) => {
        await observeVitals(page)
        await page.goto('/')
        await expect(page.getByRole('treegrid')).toBeVisible()
        await expect(
            page
                .getByRole('region', { name: 'Clients chart' })
                .locator('svg text')
                .first()
        ).toBeVisible()
        await throttleCpu(page)

        const actions: [string, () => Promise<void>][] = [
            ['open Branch 1', () => row(page, 'Branch 1').click()],
            ['open Anna Blackwood', () => row(page, 'Anna Blackwood').click()],
            ['close Branch 1', () => row(page, 'Branch 1').click()],
            ['reopen Branch 1', () => row(page, 'Branch 1').click()],
            [
                'tab onto the chart',
                async () => {
                    await page.getByRole('slider').focus()
                    await page.keyboard.press('Shift+Tab')
                    await page.keyboard.press('Tab')
                },
            ],
            [
                'step the chart 11 months',
                async () => {
                    for (let step = 0; step < 11; step += 1) {
                        await page.keyboard.press('ArrowRight')
                    }
                },
            ],
        ]

        const report: string[] = []
        for (const [name, action] of actions) {
            const from = await now(page)
            await action()
            await page.waitForTimeout(400)
            const { events } = await readVitals(page)
            const slowest = Math.max(
                0,
                ...events
                    .filter((event) => event.start >= from)
                    .map((event) => event.duration)
            )
            report.push(`${name}: ${slowest.toFixed(0)} ms`)
            expect(slowest, name).toBeLessThan(200)
        }
        console.log(report.join(' | '))
    })
})
