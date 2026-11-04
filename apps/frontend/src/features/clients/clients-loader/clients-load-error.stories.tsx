import { InvalidDataError } from '@nevis/api-contract/http'
import { fn } from 'storybook/test'

import preview from '../../../../.storybook/preview'

import { ClientsLoadError } from './clients-load-error'
import type { ClientsLoadErrorProps } from './clients-load-error'

// the errors the real client produces
const defaultArgs: ClientsLoadErrorProps = {
    error: Object.assign(new Error(), { status: 500 }),
    onRetry: fn(),
}

const meta = preview.meta({
    component: ClientsLoadError,
    args: defaultArgs,
    decorators: [
        (Story) => (
            <div className="flex flex-col gap-4">
                <Story />
            </div>
        ),
    ],
})

export const ServerError = meta.story({})

export const Timeout = meta.story({
    args: { error: new DOMException('signal timed out', 'TimeoutError') },
})

export const NetworkError = meta.story({
    args: { error: new TypeError('Failed to fetch') },
})

export const InvalidData = meta.story({
    args: { error: new InvalidDataError('Response is not JSON') },
})

// no reason known: the plain message
export const UnknownError = meta.story({ args: { error: new Error('boom') } })
