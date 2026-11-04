import { InvalidDataError } from '@nevis/api-contract/http'
import { describe, expect, it } from 'vitest'

import { describeLoadError, loadErrorMessage } from './describe-load-error'

// what the generated client throws for a non-2xx answer
const httpError = (status: number) => Object.assign(new Error(), { status })

describe('describeLoadError', () => {
    it.each([
        [
            'timeout',
            new DOMException('signal timed out', 'TimeoutError'),
            'The request timed out.',
        ],
        ['network error', new TypeError('Failed to fetch'), 'Network error.'],
        ['server error', httpError(500), 'Server error (500).'],
        ['bad gateway', httpError(502), 'Server error (502).'],
        [
            'invalid data',
            new InvalidDataError('Response is not JSON'),
            'The data was not valid.',
        ],
    ])('%s', (_what, error, reason) => {
        expect(describeLoadError(error)).toBe(reason)
    })

    it('gives no reason for an unknown error', () => {
        expect(describeLoadError(new Error('boom'))).toBeUndefined()
    })

    it('ignores a status that is not a number', () => {
        expect(
            describeLoadError(Object.assign(new Error(), { status: '500' }))
        ).toBeUndefined()
    })
})

describe('loadErrorMessage', () => {
    it('adds the reason when known', () => {
        expect(loadErrorMessage(httpError(500))).toBe(
            'Could not load clients. Server error (500).'
        )
    })

    it('is the plain message otherwise', () => {
        expect(loadErrorMessage(new Error('boom'))).toBe(
            'Could not load clients.'
        )
    })
})
