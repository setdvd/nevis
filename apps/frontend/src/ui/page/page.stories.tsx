import preview from '../../../.storybook/preview'
import { Card } from '../card/card'
import { Heading } from '../heading/heading'

import { Page } from './page'

const meta = preview.meta({
    component: Page,
    parameters: { layout: 'fullscreen' },
    args: {
        children: (
            <>
                <Heading level={1}>Clients</Heading>
                <Card title="First card">
                    <p className="p-6">First card</p>
                </Card>
                <Card title="Second card">
                    <p className="p-6">Second card</p>
                </Card>
            </>
        ),
    },
})

export const WithCards = meta.story({})

export const AlignStart = meta.story({
    args: {
        align: 'start',
        children: (
            <>
                <Heading level={1}>Something went wrong.</Heading>
                <p>Short content keeps its own width.</p>
            </>
        ),
    },
})
