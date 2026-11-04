import { AxeBuilder } from '@axe-core/playwright'
import { clientsResponse } from '@nevis/api-contract/fixtures'
import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'
import {
    clientsAfter,
    clientsBrokenShape,
    clientsHang,
    clientsHeld,
    clientsLoaded,
    clientsNetworkError,
    clientsNotJson,
    clientsServerError,
    counter,
} from './handlers'

// Page load states. Tests without network.use() hit the real API.

const heading = (page: Page) =>
    page.getByRole('heading', { level: 1, name: 'Clients' })
const chartCard = (page: Page) =>
    page.getByRole('region', { name: 'Clients chart' })
const tableCard = (page: Page) =>
    page.getByRole('region', { name: 'Clients table' })
const cards = (page: Page) => page.locator('[aria-busy]')
const statusLine = (page: Page) => page.getByRole('status')
const companyMay = (page: Page) =>
    tableCard(page)
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name: 'Company' }) })
        .getByRole('gridcell')
        .nth(3)

const pageOverflow = (page: Page) =>
    page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
    )

const expectNoAxeViolations = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
}

test.describe('real API', () => {
    test('shows the delivered data: heading, both cards, stored values', async ({
        page,
    }) => {
        const requests: string[] = []
        page.on('request', (request) => {
            if (request.url().endsWith('/clients')) {
                requests.push(request.url())
            }
        })
        await page.goto('/')

        await expect(heading(page)).toBeVisible()
        await expect(companyMay(page)).toHaveText(/^301/)
        await expect(
            chartCard(page).getByRole('slider', { name: /Clients per month/ })
        ).toBeVisible()
        await expect(cards(page)).toHaveAttribute('aria-busy', 'false')
        await expect(page.getByRole('alert')).toHaveCount(0)
        await expect(statusLine(page)).toHaveText('')
        expect(requests).toHaveLength(1)
    })
})

test.describe('loaded from mocks', () => {
    test('shows a variant of the data', async ({ page, network }) => {
        network.use(
            clientsLoaded({
                ...clientsResponse,
                company: { ...clientsResponse.company, name: 'Mocked Co' },
            })
        )
        await page.goto('/')

        await expect(
            tableCard(page).getByRole('rowheader', { name: 'Mocked Co' })
        ).toBeVisible()
    })

    test('no new request on window focus or when the network comes back', async ({
        page,
        context,
        network,
    }) => {
        const requests = counter()
        network.use(clientsLoaded(clientsResponse, requests))
        await page.goto('/')
        await expect(companyMay(page)).toHaveText(/^301/)

        await page.evaluate(() => {
            window.dispatchEvent(new Event('blur'))
            window.dispatchEvent(new Event('focus'))
            document.dispatchEvent(new Event('visibilitychange'))
        })
        await context.setOffline(true)
        await context.setOffline(false)
        await page.waitForTimeout(500)

        expect(requests.count).toBe(1)
    })
})

test.describe('loading', () => {
    test('placeholders and busy at once, "Loading clients..." only after 1 s', async ({
        page,
        network,
    }) => {
        const held = clientsHeld()
        network.use(held.handler)
        await page.goto('/')

        await expect(cards(page)).toHaveAttribute('aria-busy', 'true')
        await expect(
            chartCard(page).locator('[aria-hidden="true"]').first()
        ).toBeVisible()
        await expect(
            tableCard(page).locator('[aria-hidden="true"]').first()
        ).toBeVisible()
        await expect(page.getByRole('treegrid')).toHaveCount(0)
        await expect(statusLine(page)).toHaveText('')

        await expect(statusLine(page)).toHaveText('Loading clients...', {
            timeout: 2000,
        })

        held.open()
        await expect(companyMay(page)).toHaveText(/^301/)
        await expect(cards(page)).toHaveAttribute('aria-busy', 'false')
        // the first load never says "loaded"
        await expect(statusLine(page)).toHaveText('')
    })

    test('a load faster than 1 s announces nothing', async ({
        page,
        network,
    }) => {
        network.use(clientsAfter(400))
        const seen = new Set<string>()
        await page.goto('/')
        const deadline = Date.now() + 1500
        while (Date.now() < deadline) {
            seen.add((await statusLine(page).textContent()) ?? '')
            await page.waitForTimeout(50)
        }

        expect([...seen]).toEqual([''])
        await expect(companyMay(page)).toHaveText(/^301/)
    })
})

test.describe('errors and Retry', () => {
    test('server error: one automatic retry, then both cards show it, one alert', async ({
        page,
        network,
    }) => {
        const requests = counter()
        network.use(clientsServerError(500, requests))
        await page.goto('/')

        const message = 'Could not load clients. Server error (500).'
        await expect(chartCard(page)).toContainText(message)
        await expect(tableCard(page)).toContainText(message)
        expect(requests.count).toBe(2)
        await expect(page.getByRole('alert')).toHaveCount(1)
        await expect(chartCard(page).getByRole('alert')).toHaveText(message)
        await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(2)
        await expect(page.getByRole('treegrid')).toHaveCount(0)
        await expect(cards(page)).toHaveAttribute('aria-busy', 'false')
        await expect(statusLine(page)).toHaveText('')
    })

    test('Retry moves focus to the heading, loads, then says "Clients loaded"', async ({
        page,
        network,
    }) => {
        network.use(clientsServerError(500))
        await page.goto('/')
        await expect(page.getByRole('alert')).toBeVisible()

        network.resetHandlers(clientsAfter(1200))
        await page.getByRole('button', { name: 'Retry' }).first().focus()
        await page.keyboard.press('Enter')

        await expect(heading(page)).toBeFocused()
        await expect(heading(page)).toHaveAttribute('tabindex', '-1')
        await expect(cards(page)).toHaveAttribute('aria-busy', 'true')
        await expect(statusLine(page)).toHaveText('')

        await expect(companyMay(page)).toHaveText(/^301/)
        await expect(statusLine(page)).toHaveText('Clients loaded')

        // focusable only while Retry has put focus there
        await page.keyboard.press('Tab')
        await expect(heading(page)).not.toHaveAttribute('tabindex')
    })

    test('a failed Retry clears the status; the next one says "Clients loaded"', async ({
        page,
        network,
    }) => {
        network.use(clientsServerError(500))
        await page.goto('/')
        await page.getByRole('button', { name: 'Retry' }).first().click()
        // wait for this Retry to run and fail (not the alert from before it)
        await expect(cards(page)).toHaveAttribute('aria-busy', 'true')
        await expect(page.getByRole('alert')).toBeVisible()
        await expect(statusLine(page)).toHaveText('')

        network.resetHandlers(clientsLoaded())
        await page.getByRole('button', { name: 'Retry' }).first().click()
        await expect(companyMay(page)).toHaveText(/^301/)
        await expect(statusLine(page)).toHaveText('Clients loaded')
    })

    const reasons = [
        ['network error', () => clientsNetworkError(), 'Network error.'],
        ['non-JSON success', () => clientsNotJson(), 'The data was not valid.'],
        ['bad gateway', () => clientsServerError(502), 'Server error (502).'],
    ] as const
    for (const [name, handler, reason] of reasons) {
        test(`${name}: the error says why`, async ({ page, network }) => {
            network.use(handler())
            await page.goto('/')

            await expect(page.getByRole('alert')).toHaveText(
                `Could not load clients. ${reason}`
            )
        })
    }

    test('both attempts get no answer: the request timed out', async ({
        page,
        network,
    }) => {
        // two attempts of 10 s each, plus the retry delay
        test.setTimeout(45_000)
        const requests = counter()
        network.use(clientsHang(requests))
        await page.goto('/')

        await expect(page.getByRole('alert')).toHaveText(
            'Could not load clients. The request timed out.',
            { timeout: 30_000 }
        )
        expect(requests.count).toBe(2)
    })

    test('offline: Retry ends in a network error instead of waiting', async ({
        page,
        context,
        network,
    }) => {
        network.use(clientsServerError(500))
        await page.goto('/')
        await expect(page.getByRole('alert')).toBeVisible()

        network.resetHandlers()
        await context.setOffline(true)
        await page.getByRole('button', { name: 'Retry' }).first().click()

        await expect(page.getByRole('alert')).toHaveText(
            'Could not load clients. Network error.',
            { timeout: 5000 }
        )
    })
})

test.describe('crash fallback', () => {
    test('a render crash shows the fallback; Reload brings the page back', async ({
        page,
        network,
    }) => {
        network.use(clientsBrokenShape())
        page.on('pageerror', () => undefined)
        await page.goto('/')

        await expect(
            page.getByRole('heading', { name: 'Something went wrong.' })
        ).toBeVisible()

        network.resetHandlers()
        await page.getByRole('button', { name: 'Reload' }).click()
        await expect(companyMay(page)).toHaveText(/^301/)
    })
})

test.describe('accessibility and width in every load state', () => {
    for (const width of [1440, 375]) {
        test(`loading, error and loaded at ${String(width)}px`, async ({
            page,
            network,
        }) => {
            await page.setViewportSize({ width, height: 900 })

            const held = clientsHeld()
            network.use(held.handler)
            await page.goto('/')
            await expect(cards(page)).toHaveAttribute('aria-busy', 'true')
            await expectNoAxeViolations(page)
            expect(await pageOverflow(page)).toBe(0)
            held.open()
            await expect(companyMay(page)).toHaveText(/^301/)
            await expectNoAxeViolations(page)
            expect(await pageOverflow(page)).toBe(0)

            network.resetHandlers(clientsServerError(500))
            await page.reload()
            await expect(page.getByRole('alert')).toBeVisible()
            await expectNoAxeViolations(page)
            expect(await pageOverflow(page)).toBe(0)
        })
    }
})

test.describe('page width', () => {
    const widths = [
        [1920, 1408, 256],
        [1440, 1408, 16],
        [375, 343, 16],
    ] as const
    for (const [window, content, side] of widths) {
        test(`${String(window)}px window: cards ${String(content)}px, ${String(side)}px each side`, async ({
            page,
        }) => {
            await page.setViewportSize({ width: window, height: 900 })
            await page.goto('/')
            await expect(companyMay(page)).toHaveText(/^301/)

            for (const card of [chartCard(page), tableCard(page)]) {
                const box = await card.boundingBox()
                expect(box?.width).toBe(content)
                expect(box?.x).toBe(side)
            }
        })
    }
})
