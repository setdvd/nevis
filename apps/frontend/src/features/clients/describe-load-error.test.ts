import { InvalidDataError } from '@nevis/api-contract/http'
import { describe, expect, it } from 'vitest'

import { loadErrorReason } from './describe-load-error'

// what the generated client throws for a non-2xx answer
const httpError = (status: number) => Object.assign(new Error(), { status })

describe('loadErrorReason', () => {
    it.each([
        [
            'timeout',
            new DOMException('signal timed out', 'TimeoutError'),
            { kind: 'timeout' },
        ],
        [
            'network error',
            new TypeError('Failed to fetch'),
            { kind: 'network' },
        ],
        ['server error', httpError(500), { kind: 'server', status: 500 }],
        ['bad gateway', httpError(502), { kind: 'server', status: 502 }],
        [
            'invalid data',
            new InvalidDataError('Response is not JSON'),
            { kind: 'invalidData' },
        ],
    ])('%s', (_what, error, reason) => {
        expect(loadErrorReason(error)).toEqual(reason)
    })

    it('gives no reason for an unknown error', () => {
        expect(loadErrorReason(new Error('boom'))).toBeUndefined()
    })

    it('ignores a status that is not a number', () => {
        expect(
            loadErrorReason(Object.assign(new Error(), { status: '500' }))
        ).toBeUndefined()
    })
})
