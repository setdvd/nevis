import { defineNetworkFixture } from '@msw/playwright'
import type { NetworkFixture } from '@msw/playwright'
import { test as base } from '@playwright/test'

type Fixtures = {
    network: NetworkFixture
}

// MSW in the browser context of every test. No default handlers: a test that
// calls no network.use() talks to the real API. Requests no handler matches
// (the page, its assets) pass through.
export const test = base.extend<Fixtures>({
    network: [
        async ({ context }, use) => {
            const network = defineNetworkFixture({
                context,
                handlers: [],
                onUnhandledFrame: 'bypass',
            })
            await network.enable()
            await use(network)
            await network.disable()
        },
        { auto: true },
    ],
})

export { expect } from '@playwright/test'
