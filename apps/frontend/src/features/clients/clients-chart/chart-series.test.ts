import { readFileSync } from 'node:fs'

import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'
import type { Company } from '@nevis/api-contract/model'
import { describe, expect, it } from 'vitest'

import {
    barTotals,
    CHANNEL_COLORS,
    EXISTING_COLOR,
    seriesColors,
    toChartSeries,
    yAxisFor,
} from './chart-series'

const { company } = clientsResponse
const series = toChartSeries(company)

const at = (monthIndex: number) =>
    series.map(({ values }) => values[monthIndex])

// a copy of the delivered data with Anna's channels replaced
const withAnnaChannels = (
    channels: { name: string; values: number[] }[]
): Company => ({
    ...company,
    branches: company.branches.map((branch) => ({
        ...branch,
        ...(branch.employees !== undefined && {
            employees: branch.employees.map((advisor) =>
                advisor.channels === undefined
                    ? advisor
                    : {
                          ...advisor,
                          channels: channels.map((channel, index) => ({
                              id: `00000000-0000-4000-8000-00000000010${String(index)}`,
                              ...channel,
                          })),
                      }
            ),
        }),
    })),
})

const same = (value: number) => company.values.map(() => value)

describe('toChartSeries on the delivered data', () => {
    it('gives Existing clients first, then the channels in data order', () => {
        expect(series.map(({ name }) => name)).toEqual([
            'Existing clients',
            'New organic',
            'New paid',
        ])
    })

    it('splits each month into existing / organic / paid', () => {
        expect(at(0)).toEqual([250, 0, 0]) // Feb 2024
        expect(at(5)).toEqual([331, 2, 1]) // Jul 2024
        expect(at(11)).toEqual([346, 2, 2]) // Jan 2025
    })

    it('makes every bar reach the stored Company value of its month', () => {
        expect(barTotals(series)).toEqual(company.values)
    })

    it('ignores the stored "Existing clients" channel (derived instead)', () => {
        // Anna's channel says 25 in Feb; the bar uses Company minus new clients
        expect(series[0]?.values[0]).toBe(250)
    })
})

describe('toChartSeries on other data', () => {
    it('adds a series for an extra channel and keeps the total', () => {
        const extra = toChartSeries(
            withAnnaChannels([
                { name: 'New organic', values: same(1) },
                { name: 'New paid', values: same(1) },
                { name: 'Referral', values: same(3) },
            ])
        )

        expect(extra.map(({ name }) => name)).toEqual([
            'Existing clients',
            'New organic',
            'New paid',
            'Referral',
        ])
        expect(extra[0]?.values[0]).toBe(250 - 5)
        expect(barTotals(extra)).toEqual(company.values)
    })

    it('has no series for a channel missing everywhere', () => {
        const noPaid = toChartSeries(
            withAnnaChannels([{ name: 'New organic', values: same(2) }])
        )

        expect(noPaid.map(({ name }) => name)).toEqual([
            'Existing clients',
            'New organic',
        ])
        expect(noPaid[0]?.values[0]).toBe(248)
    })

    it('sums a channel over all advisors', () => {
        // example data: only Ada has channels; Referral 2 a month
        const example = toChartSeries(exampleResponse.company)
        expect(example.map(({ name }) => name)).toEqual([
            'Existing clients',
            'Referral',
        ])
        expect(example[0]?.values[0]).toBe(28)
    })

    it('never goes below 0 when new clients exceed the Company value', () => {
        const over = toChartSeries(
            withAnnaChannels([{ name: 'New paid', values: same(400) }])
        )

        expect(over[0]?.values[0]).toBe(0)
        // the bar is then taller than the Company value
        expect(barTotals(over)[0]).toBe(400)
    })

    it('shows only Existing clients when there are no channels at all', () => {
        const none = toChartSeries({
            ...company,
            branches: company.branches.map(({ id, name, values }) => ({
                id,
                name,
                values,
            })),
        })

        expect(none).toEqual([
            { name: 'Existing clients', values: company.values },
        ])
    })
})

describe('yAxisFor', () => {
    it.each([
        [350, 400],
        [399, 400],
        [400, 500],
        [0, 100],
        [45, 100],
    ])('highest bar %i -> axis 0..%i in steps of 100', (highest, max) => {
        expect(yAxisFor(highest)).toEqual({ max, step: 100 })
    })
})

describe('seriesColors', () => {
    it('gives the design colours to the delivered series', () => {
        expect(seriesColors(series)).toEqual(['#b29df8', '#f4beb4', '#a75e6e'])
    })

    it('keeps the Existing colour and takes the palette in order for others', () => {
        const names = ['Existing clients', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
        const colors = seriesColors(names.map((name) => ({ name, values: [] })))

        expect(colors[0]).toBe(EXISTING_COLOR)
        expect(colors.slice(1)).toEqual([...CHANNEL_COLORS, CHANNEL_COLORS[0]])
    })

    it('matches the series tokens in index.css', () => {
        const css = readFileSync(
            new URL('../../../index.css', import.meta.url),
            'utf8'
        )
        const token = (name: string) =>
            new RegExp(`--color-series-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(
                css
            )?.[1]

        expect([token('existing'), token('organic'), token('paid')]).toEqual(
            seriesColors(series)
        )
    })
})
