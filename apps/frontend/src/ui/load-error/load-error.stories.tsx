import { fn } from 'storybook/test'

import preview from '../../../.storybook/preview'

import { LoadError } from './load-error'

const meta = preview.meta({
    component: LoadError,
    args: {
        message: 'Could not load clients. Server error (500).',
        retryLabel: 'Retry',
        onRetry: fn(),
    },
})

export const Default = meta.story({})

export const Announced = meta.story({ args: { announce: true } })

export const NoReason = meta.story({
    args: { message: 'Could not load clients.' },
})
