import { expect, test } from '@playwright/test'

test('page opens with the heading', async ({ page }) => {
    await page.goto('/')
    await expect(
        page.getByRole('heading', { level: 1, name: 'Clients' })
    ).toBeVisible()
})
