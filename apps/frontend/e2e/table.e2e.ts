import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Clients table against the production build and the real API (delivered data).

const table = (page: Page) =>
    page.getByRole('treegrid', { name: 'Clients per month' })

const row = (page: Page, name: string) =>
    table(page)
        .getByRole('row')
        .filter({
            has: page.getByRole('rowheader', { name, exact: true }),
        })

// body rows in page order, by their row header name (aria-hidden parts, e.g.
// avatar initials, left out, like a screen reader does)
const rowNames = (page: Page): Promise<string[]> =>
    table(page)
        .getByRole('rowheader')
        .evaluateAll((cells) =>
            cells.map((cell) => {
                const walker = document.createTreeWalker(
                    cell,
                    NodeFilter.SHOW_TEXT
                )
                let text = ''
                for (
                    let node = walker.nextNode();
                    node !== null;
                    node = walker.nextNode()
                ) {
                    if (
                        node.parentElement?.closest('[aria-hidden="true"]') ==
                        null
                    ) {
                        text += node.nodeValue ?? ''
                    }
                }
                return text.trim()
            })
        )

const openAt = async (page: Page, width: number) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(table(page)).toBeVisible()
}

const expectNoAxeViolations = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
}

const scrollLeft = (scroller: Locator) =>
    scroller.evaluate((element) => element.scrollLeft)

test.describe('start state and data', () => {
    test('shows Company open and its 3 branches, with stored values', async ({
        page,
    }) => {
        await openAt(page, 1440)

        expect(await rowNames(page)).toEqual([
            'Company',
            'Branch 1',
            'Branch 2',
            'Branch 3',
        ])
        await expect(
            table(page).getByRole('columnheader').filter({ hasText: /\d{4}/ })
        ).toHaveText([
            'Feb 2024',
            'Mar 2024',
            'Apr 2024',
            'May 2024',
            'Jun 2024',
            'Jul 2024',
            'Aug 2024',
            'Sep 2024',
            'Oct 2024',
            'Nov 2024',
            'Dec 2024',
            'Jan 2025',
        ])
        // stored totals, not sums of children: May 301 (branches add to 279)
        await expect(
            row(page, 'Company').getByRole('gridcell').nth(3)
        ).toHaveText(/^301/)
        await expect(
            row(page, 'Branch 1').getByRole('gridcell').nth(6)
        ).toHaveText(/^214/)
    })

    test('marks totals that differ from their children, for screen readers too', async ({
        page,
    }) => {
        await openAt(page, 1440)

        await expect(
            row(page, 'Company').getByRole('gridcell').nth(3)
        ).toContainText('Stored 301, children sum to 279')
        await expect(
            row(page, 'Branch 2').getByRole('gridcell').nth(3)
        ).toHaveText('87')
    })
})

test.describe('open and close with the mouse', () => {
    test('opens branches and advisors; closing a row closes its open children', async ({
        page,
    }) => {
        await openAt(page, 1440)

        await row(page, 'Branch 1').click()
        expect(await rowNames(page)).toEqual([
            'Company',
            'Branch 1',
            'Anna Blackwood',
            'James Walker',
            'Maria Gutierrez',
            'Robert Chen',
            'Sarah Smith',
            'Branch 2',
            'Branch 3',
        ])

        await row(page, 'Anna Blackwood').click()
        await expect(row(page, 'Existing clients')).toBeVisible()
        await expect(row(page, 'New organic')).toBeVisible()
        await expect(row(page, 'New paid')).toBeVisible()

        await row(page, 'Branch 1').click()
        expect(await rowNames(page)).toEqual([
            'Company',
            'Branch 1',
            'Branch 2',
            'Branch 3',
        ])

        // reopened: Anna is closed again
        await row(page, 'Branch 1').click()
        await expect(row(page, 'Anna Blackwood')).toHaveAttribute(
            'aria-expanded',
            'false'
        )
        await expect(row(page, 'Existing clients')).toHaveCount(0)
    })

    test('a row without children does nothing and is not shown as clickable', async ({
        page,
    }) => {
        await openAt(page, 1440)

        await row(page, 'Branch 2').click()

        expect(await rowNames(page)).toHaveLength(4)
        await expect(row(page, 'Branch 2')).not.toHaveAttribute('aria-expanded')
        await expect(row(page, 'Branch 2')).toHaveCSS('cursor', 'auto')
        await expect(row(page, 'Branch 1')).toHaveCSS('cursor', 'pointer')
    })

    test('advisor rows show the photo', async ({ page }) => {
        await openAt(page, 1440)
        await row(page, 'Branch 1').click()

        const photo = row(page, 'Anna Blackwood').locator('img')
        await expect(photo).toHaveAttribute(
            'src',
            '/avatars/e3c4637b-2f21-4b7e-883e-b13ae1a6df6a.jpg'
        )
        await expect
            .poll(() =>
                photo.evaluate((img: HTMLImageElement) => img.naturalWidth)
            )
            .toBeGreaterThan(0)
    })
})

test.describe('keyboard', () => {
    test('one Tab stop; Right opens, Left goes to the parent, then closes', async ({
        page,
    }) => {
        await openAt(page, 1440)

        await page.keyboard.press('Tab')
        await expect(row(page, 'Company')).toBeFocused()

        await page.keyboard.press('ArrowDown')
        await expect(row(page, 'Branch 1')).toBeFocused()

        await page.keyboard.press('ArrowRight')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'true'
        )

        await page.keyboard.press('ArrowDown')
        await expect(row(page, 'Anna Blackwood')).toBeFocused()

        // Anna is closed: Left goes to the parent row
        await page.keyboard.press('ArrowLeft')
        await expect(row(page, 'Branch 1')).toBeFocused()

        // Branch 1 is open: Left closes it, focus stays
        await page.keyboard.press('ArrowLeft')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'false'
        )
        await expect(row(page, 'Branch 1')).toBeFocused()

        await page.keyboard.press('Tab')
        await expect(table(page).locator(':focus')).toHaveCount(0)
    })

    test('Enter toggles, Space does nothing', async ({ page }) => {
        await openAt(page, 1440)
        await page.keyboard.press('Tab')
        await page.keyboard.press('ArrowDown')

        await page.keyboard.press('Enter')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'true'
        )

        await page.keyboard.press(' ')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'true'
        )

        await page.keyboard.press('Enter')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'false'
        )
    })
})

test.describe('hierarchy for assistive technology', () => {
    test('treegrid with levels; only rows with children have an expanded state', async ({
        page,
    }) => {
        await openAt(page, 1440)
        await row(page, 'Branch 1').click()
        await row(page, 'Anna Blackwood').click()

        const levels: [string, string][] = [
            ['Company', '1'],
            ['Branch 1', '2'],
            ['Anna Blackwood', '3'],
            ['Existing clients', '4'],
            ['James Walker', '3'],
            ['Branch 2', '2'],
        ]
        for (const [name, level] of levels) {
            await expect(row(page, name)).toHaveAttribute('aria-level', level)
        }

        const expandable = await table(page)
            .locator('tbody [role="row"][aria-expanded]')
            .count()
        expect(expandable).toBe(3)
        await expect(row(page, 'Existing clients')).not.toHaveAttribute(
            'aria-expanded'
        )
        // avatars are hidden; the name is read once
        await expect(
            table(page).getByRole('rowheader', {
                name: 'Anna Blackwood',
                exact: true,
            })
        ).toHaveCount(1)
    })
})

test.describe('narrow screen (375px)', () => {
    test('only the table scrolls sideways, and opening a row does not scroll it', async ({
        page,
    }) => {
        await openAt(page, 375)
        const scroller = page.locator('.table-scroller')

        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth
            )
        ).toBe(0)
        expect(
            await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)
        ).toBe(true)

        await page.keyboard.press('Tab')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowRight')
        await expect(row(page, 'Branch 1')).toHaveAttribute(
            'aria-expanded',
            'true'
        )
        expect(await scrollLeft(scroller)).toBe(0)
    })

    test('a focused month cell is never under the sticky name column', async ({
        page,
    }) => {
        await openAt(page, 375)
        await page.keyboard.press('Tab')
        // Right on the Company row (already open) moves to its name cell
        await page.keyboard.press('ArrowRight')
        await expect(row(page, 'Company').getByRole('rowheader')).toBeFocused()

        const nameColumn = row(page, 'Company').getByRole('rowheader')
        // the 12 month cells, Feb 2024 to Jan 2025
        for (let step = 0; step < 12; step += 1) {
            await page.keyboard.press('ArrowRight')
            const gap = await page.evaluate(() => {
                const focused = document.activeElement?.getBoundingClientRect()
                const name = document
                    .querySelector('[role="rowheader"]')
                    ?.getBoundingClientRect()
                return focused && name ? focused.left - name.right : -1
            })
            // -1: sub-pixel rounding; a hidden cell would be far below that
            expect(gap).toBeGreaterThanOrEqual(-1)
        }
        await expect(
            row(page, 'Company').getByRole('gridcell').last()
        ).toBeFocused()
        await expect(nameColumn).toBeInViewport()
    })

    test('a long name shows in full while its row has keyboard focus', async ({
        page,
    }) => {
        await openAt(page, 375)
        await page.keyboard.press('Tab')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowRight')

        const name = row(page, 'Maria Gutierrez').getByText('Maria Gutierrez')
        const isCut = () =>
            name.evaluate((el) => el.scrollWidth > el.clientWidth)
        expect(await isCut()).toBe(true)

        for (let step = 0; step < 3; step += 1) {
            await page.keyboard.press('ArrowDown')
        }
        await expect(row(page, 'Maria Gutierrez')).toBeFocused()
        expect(await isCut()).toBe(false)
    })
})

test.describe('loading placeholder', () => {
    for (const width of [1440, 375]) {
        test(`has the height of the table (${String(width)}px)`, async ({
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
            const card = page.getByRole('region', { name: 'Clients table' })
            await expect(card).toBeVisible()
            const loading = await card.evaluate(
                (el) => el.getBoundingClientRect().height
            )

            gate.open()
            await expect(table(page)).toBeVisible()
            const loaded = await card.evaluate(
                (el) => el.getBoundingClientRect().height
            )
            expect(Math.abs(loaded - loading)).toBeLessThanOrEqual(4)
        })
    }
})

test.describe('accessibility checks', () => {
    // reduced motion: newly opened rows fade in, and axe would measure their
    // contrast mid-fade
    test.use({ reducedMotion: 'reduce' })

    for (const width of [1440, 375]) {
        test(`no axe violations, rows closed and open (${String(width)}px)`, async ({
            page,
        }) => {
            await openAt(page, width)
            await expectNoAxeViolations(page)

            await row(page, 'Branch 1').click()
            await row(page, 'Anna Blackwood').click()
            await expectNoAxeViolations(page)
        })
    }
})
