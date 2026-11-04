import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Clients chart against the production build and the real API (delivered data).

const chart = (page: Page) =>
    page.getByRole('slider', {
        name: 'Clients per month, Feb 2024 to Jan 2025',
    })

const card = (page: Page) => page.getByRole('region', { name: 'Clients chart' })

// the month part of the chart's value, e.g. "Jul 2024"
const activeMonth = async (page: Page) =>
    ((await chart(page).getAttribute('aria-valuetext')) ?? '').split(':')[0]

const openAt = async (page: Page, width: number) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(chart(page)).toBeVisible()
    // ECharts draws after the lazy chunk has loaded
    await expect(card(page).locator('svg text').first()).toBeVisible()
}

// the visible tooltip (ECharts keeps a faded one in the DOM after hiding)
const tooltip = (page: Page) =>
    card(page).locator('.echarts-for-react > div').filter({ hasText: 'Total' })

test.describe('data in the chart', () => {
    test('one bar per month, 0 to 400, the delivered series in the legend', async ({
        page,
    }) => {
        await openAt(page, 1440)

        const texts = await card(page).locator('svg text').allTextContents()
        expect(texts.filter((text) => /^\d+$/.test(text))).toEqual([
            '0',
            '100',
            '200',
            '300',
            '400',
        ])
        expect(texts.filter((text) => /\d{4}$/.test(text))).toHaveLength(12)
        await expect(card(page).getByRole('listitem')).toHaveText([
            'Existing clients',
            'New organic',
            'New paid',
        ])
    })

    test('the data table for screen readers has every month and the Total', async ({
        page,
    }) => {
        await openAt(page, 1440)
        const table = card(page).getByRole('table', {
            name: 'Clients per month',
        })

        await expect(table.getByRole('columnheader')).toHaveText([
            'Month',
            'Existing clients',
            'New organic',
            'New paid',
            'Total',
        ])
        await expect(table.getByRole('row')).toHaveCount(13)
        await expect(table.getByRole('row', { name: /^Jul 2024/ })).toHaveText(
            /Jul 2024\s*331\s*2\s*1\s*334/
        )
        // every total is the stored Company value of its month
        const totals = await table
            .locator('tbody tr td:last-child')
            .allTextContents()
        expect(totals).toEqual([
            '250',
            '267',
            '284',
            '301',
            '317',
            '334',
            '350',
            '250',
            '250',
            '250',
            '250',
            '350',
        ])
    })

    test('hovering a month shows its parts and the total', async ({ page }) => {
        await openAt(page, 1440)
        const plot = await card(page)
            .locator('.echarts-for-react')
            .boundingBox()
        if (plot === null) {
            throw new Error('chart not drawn')
        }

        // Jul 2024: the 6th of 12 bars (grid: 40px left, 8px right)
        await page.mouse.move(
            plot.x + 40 + ((plot.width - 48) * 5.5) / 12,
            plot.y + plot.height / 2
        )

        await expect(tooltip(page)).toContainText('Jul 2024')
        await expect(tooltip(page)).toHaveText(
            /Existing clients\s*331.*New organic\s*2.*New paid\s*1.*Total\s*334/s
        )
        // the pointer does not move the keyboard month
        expect(await activeMonth(page)).toBe('Feb 2024')
    })
})

test.describe('keyboard', () => {
    test('Tab shows the first month; arrows, Home and End step without wrapping', async ({
        page,
    }) => {
        await openAt(page, 1440)

        await page.keyboard.press('Tab')
        await expect(chart(page)).toBeFocused()
        await expect(chart(page)).toHaveAttribute(
            'aria-valuetext',
            'Feb 2024: Existing clients 250, New organic 0, New paid 0, Total 250'
        )
        await expect(tooltip(page)).toContainText('Feb 2024')

        const steps: [string, string][] = [
            ['ArrowRight', 'Mar 2024'],
            ['ArrowRight', 'Apr 2024'],
            ['ArrowLeft', 'Mar 2024'],
            ['ArrowUp', 'Apr 2024'],
            ['ArrowDown', 'Mar 2024'],
            ['End', 'Jan 2025'],
            ['ArrowRight', 'Jan 2025'],
            ['Home', 'Feb 2024'],
            ['ArrowLeft', 'Feb 2024'],
        ]
        for (const [key, month] of steps) {
            await page.keyboard.press(key)
            expect(await activeMonth(page), `${key} -> ${month}`).toBe(month)
        }
        await expect(tooltip(page)).toContainText('Feb 2024')
        // the keys step the chart, they do not scroll the page
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })

    test('the value reads like the tooltip, in the same words', async ({
        page,
    }) => {
        await openAt(page, 1440)
        await page.keyboard.press('Tab')
        for (let step = 0; step < 5; step += 1) {
            await page.keyboard.press('ArrowRight')
        }

        await expect(chart(page)).toHaveAttribute(
            'aria-valuetext',
            'Jul 2024: Existing clients 331, New organic 2, New paid 1, Total 334'
        )
        await expect(chart(page)).toHaveAttribute('aria-valuenow', '6')
        await expect(chart(page)).toHaveAttribute(
            'aria-roledescription',
            'chart'
        )
    })

    test('Escape hides the tooltip and keeps the month; leaving ends the session', async ({
        page,
    }) => {
        await openAt(page, 1440)
        await page.keyboard.press('Tab')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('ArrowRight')

        await page.keyboard.press('Escape')
        await expect(tooltip(page)).toBeHidden()
        await page.keyboard.press('ArrowRight')
        expect(await activeMonth(page)).toBe('May 2024')

        await page.keyboard.press('Tab')
        await page.keyboard.press('Shift+Tab')
        expect(await activeMonth(page)).toBe('Feb 2024')
    })
})

test.describe('narrow screen (375px)', () => {
    test('12 bars without page scroll; visible month labels never overlap', async ({
        page,
    }) => {
        await openAt(page, 375)

        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth
            )
        ).toBe(0)
        const labels = await card(page)
            .locator('svg text')
            .evaluateAll((texts) =>
                texts
                    .filter((text) => /\d{4}$/.test(text.textContent))
                    .map((text) => {
                        const box = text.getBoundingClientRect()
                        return { left: box.left, right: box.right }
                    })
            )
        expect(labels.length).toBeGreaterThan(1)
        expect(labels.length).toBeLessThan(12)
        labels.slice(1).forEach((label, index) => {
            expect(label.left).toBeGreaterThanOrEqual(labels[index]?.right ?? 0)
        })
        // every month is still in the data table
        await expect(
            card(page).getByRole('table').locator('tbody tr')
        ).toHaveCount(12)
    })
})

test.describe('loading placeholder', () => {
    for (const width of [1440, 375]) {
        test(`has the height of the chart card (${String(width)}px)`, async ({
            page,
        }) => {
            await page.setViewportSize({ width, height: 900 })
            // holds the API answer until the placeholder is measured
            const gate = { open: (): void => undefined }
            const held = new Promise<void>((resolve) => {
                gate.open = resolve
            })
            await page.route('**/clients', async (route) => {
                await held
                await route.continue()
            })
            await page.goto('/')
            await expect(card(page)).toBeVisible()
            const loading = await card(page).evaluate(
                (el) => el.getBoundingClientRect().height
            )

            gate.open()
            await expect(card(page).locator('svg text').first()).toBeVisible()
            const loaded = await card(page).evaluate(
                (el) => el.getBoundingClientRect().height
            )
            expect(Math.abs(loaded - loading)).toBeLessThanOrEqual(4)
        })
    }
})

test.describe('accessibility checks', () => {
    for (const width of [1440, 375]) {
        test(`no axe violations with the chart focused (${String(width)}px)`, async ({
            page,
        }) => {
            await openAt(page, width)
            await page.keyboard.press('Tab')
            await page.keyboard.press('ArrowRight')

            const { violations } = await new AxeBuilder({ page }).analyze()
            expect(violations.map((violation) => violation.id)).toEqual([])
        })
    }
})
