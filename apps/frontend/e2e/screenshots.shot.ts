import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'
import { clientsServerError } from './handlers'

const OUT = '../../docs/screenshots'

const row = (page: Page, name: string) =>
    page
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name, exact: true }) })

const openLoaded = async (page: Page, width: number, height: number) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page.getByRole('treegrid')).toBeVisible()
    await expect(
        page.locator('.echarts-for-react svg text').first()
    ).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
}

test('desktop', async ({ page }) => {
    await openLoaded(page, 1440, 900)
    await page.screenshot({ path: `${OUT}/desktop.png`, fullPage: true })
})

test('table open', async ({ page }) => {
    await openLoaded(page, 1440, 900)
    await row(page, 'Branch 1').click()
    await row(page, 'Anna Blackwood').click()
    await page.mouse.move(0, 0)
    await page.screenshot({ path: `${OUT}/table-open.png`, fullPage: true })
})

test('chart keyboard', async ({ page }) => {
    await openLoaded(page, 1440, 900)
    await page.keyboard.press('Tab')
    for (let step = 0; step < 5; step += 1) {
        await page.keyboard.press('ArrowRight')
    }
    await page
        .getByRole('region', { name: 'Clients chart' })
        .screenshot({ path: `${OUT}/chart-keyboard.png` })
})

test('mobile', async ({ page }) => {
    await openLoaded(page, 375, 812)
    await row(page, 'Branch 1').click()
    await page.mouse.move(0, 0)
    await page.screenshot({ path: `${OUT}/mobile.png`, fullPage: true })
})

test('error', async ({ page, network }) => {
    network.use(clientsServerError(500))
    await page.setViewportSize({ width: 1440, height: 700 })
    await page.goto('/')
    await expect(page.getByRole('alert')).toBeVisible()
    await page.screenshot({ path: `${OUT}/error.png` })
})
