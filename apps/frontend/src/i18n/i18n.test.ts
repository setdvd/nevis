import { describe, expect, it } from 'vitest'

import { en } from './en'
import { createI18n } from './i18n-context'

describe('en messages', () => {
    it.each([
        [undefined, 'Could not load clients.'],
        [
            { kind: 'timeout' } as const,
            'Could not load clients. The request timed out.',
        ],
        [
            { kind: 'network' } as const,
            'Could not load clients. Network error.',
        ],
        [
            { kind: 'server', status: 500 } as const,
            'Could not load clients. Server error (500).',
        ],
        [
            { kind: 'invalidData' } as const,
            'Could not load clients. The data was not valid.',
        ],
    ])('load error %j', (reason, text) => {
        expect(en.load.error(reason)).toBe(text)
    })

    it('puts the values into the texts', () => {
        expect(en.chart.label('Feb 2024', 'Jan 2025')).toBe(
            'Clients per month, Feb 2024 to Jan 2025'
        )
        expect(en.table.mismatch('301', '279')).toBe(
            'Stored 301, children sum to 279'
        )
    })
})

describe('createI18n', () => {
    it('formats numbers and months for its locale', () => {
        const us = createI18n('en-US', en)
        const de = createI18n('de-DE', en)

        expect(us.formatNumber(1234)).toBe('1,234')
        expect(de.formatNumber(1234)).toBe('1.234')
        expect(us.formatMonth('2024-05')).toBe('May 2024')
        expect(de.formatMonth('2024-05')).toBe('Mai 2024')
    })

    it('keeps the given messages and locale', () => {
        const i18n = createI18n('en-GB', en)
        expect(i18n.locale).toBe('en-GB')
        expect(i18n.messages).toBe(en)
    })
})
