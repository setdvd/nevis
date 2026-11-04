import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatMonth } from './format-month'

const DATA_MONTHS = [
    '2024-02',
    '2024-03',
    '2024-04',
    '2024-05',
    '2024-06',
    '2024-07',
    '2024-08',
    '2024-09',
    '2024-10',
    '2024-11',
    '2024-12',
    '2025-01',
]

const originalTimeZone = process.env['TZ']

afterEach(() => {
    if (originalTimeZone === undefined) {
        delete process.env['TZ']
    } else {
        process.env['TZ'] = originalTimeZone
    }
    vi.resetModules()
})

describe('formatMonth', () => {
    it('formats the data months', () => {
        expect(DATA_MONTHS.map(formatMonth)).toEqual([
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
    })

    it('keeps the year as written', () => {
        expect(formatMonth('0001-02')).toBe('Feb 0001')
        expect(formatMonth('0099-12')).toBe('Dec 0099')
    })

    it.each([
        '2024-13',
        '2024-00',
        '2024-2',
        '24-02',
        '2024-02-01',
        ' 2024-02',
        'Feb 2024',
        'abc',
        '',
    ])('throws on %j', (input) => {
        expect(() => formatMonth(input)).toThrow(RangeError)
    })

    it.each(['America/New_York', 'Pacific/Kiritimati', 'Asia/Kathmandu'])(
        'gives the same label in time zone %s',
        async (timeZone) => {
            process.env['TZ'] = timeZone
            // fresh module: the formatter is created under this time zone
            const fresh = await import('./format-month')

            // the trap is real here: 1 Feb 00:00 UTC is 31 Jan in New York
            if (timeZone === 'America/New_York') {
                expect(new Date(Date.UTC(2024, 1, 1)).getDate()).toBe(31)
            }
            expect(DATA_MONTHS.map(fresh.formatMonth)).toEqual(
                DATA_MONTHS.map(formatMonth)
            )
            expect(fresh.formatMonth('2024-02')).toBe('Feb 2024')
        }
    )
})
