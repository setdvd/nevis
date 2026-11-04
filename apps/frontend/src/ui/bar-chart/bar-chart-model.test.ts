import { describe, expect, it } from 'vitest'

import {
    BAR_CHART_PLOT_HEIGHT,
    describeCategory,
    MIN_PART_PX,
    withMinimumParts,
    escapeHtml,
    stepCategory,
    toBarOption,
    tooltipHtml,
} from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'

const CATEGORIES = ['Jan', 'Feb', 'Mar']

const SERIES: BarChartSeries[] = [
    { name: 'Base', values: [10, 20, 0], color: '#111111' },
    { name: 'Middle', values: [0, 5, 0], color: '#222222' },
    { name: 'Top', values: [3, 0, 4], color: '#333333' },
]

const option = toBarOption({
    categories: CATEGORIES,
    series: SERIES,
    yAxis: { max: 100, step: 25 },
    animate: true,
    tooltip: (index) => `tip ${String(index)}`,
})

const seriesList = Array.isArray(option.series) ? option.series : []

// reads a nested option value without casts (ECharts option types are wide unions)
const read = (value: unknown, ...path: string[]): unknown =>
    path.reduce<unknown>(
        (current, key) =>
            typeof current === 'object' && current !== null && key in current
                ? Reflect.get(current, key)
                : undefined,
        value
    )

const dataOf = (seriesIndex: number) => {
    const item = seriesList[seriesIndex]
    return item?.type === 'bar' && Array.isArray(item.data) ? item.data : []
}

describe('toBarOption', () => {
    it('stacks one bar per category, series in order', () => {
        expect(seriesList.map((item) => [item.name, item.stack])).toEqual([
            ['Base', 'total'],
            ['Middle', 'total'],
            ['Top', 'total'],
        ])
        expect(option.xAxis).toMatchObject({ data: CATEGORIES })
    })

    it('passes the values and colours through unchanged', () => {
        expect(dataOf(0).map((point) => read(point, 'value'))).toEqual([
            10, 20, 0,
        ])
        expect(dataOf(2).map((point) => read(point, 'value'))).toEqual([
            3, 0, 4,
        ])
        expect(
            seriesList.map((item) => read(item, 'itemStyle', 'color'))
        ).toEqual(['#111111', '#222222', '#333333'])
    })

    it('uses the given axis: 0 to max in steps', () => {
        expect(option.yAxis).toMatchObject({ min: 0, max: 100, interval: 25 })
    })

    it('rounds the outer corners of each visible bar only', () => {
        const corners = (seriesIndex: number, index: number) =>
            read(dataOf(seriesIndex)[index], 'itemStyle', 'borderRadius')

        // Jan: Base (bottom) and Top (top) visible, Middle is 0
        expect(corners(0, 0)).toEqual([0, 0, 4, 4])
        expect(corners(1, 0)).toEqual([0, 0, 0, 0])
        expect(corners(2, 0)).toEqual([4, 4, 0, 0])
        // Feb: Base bottom, Middle top
        expect(corners(0, 1)).toEqual([0, 0, 4, 4])
        expect(corners(1, 1)).toEqual([4, 4, 0, 0])
        // Mar: only Top visible -> all four corners
        expect(corners(2, 2)).toEqual([4, 4, 4, 4])
    })

    it('turns animation off when asked (reduced motion)', () => {
        expect(
            toBarOption({
                categories: CATEGORIES,
                series: SERIES,
                yAxis: { max: 100, step: 25 },
                animate: false,
                tooltip: () => '',
            })
        ).toMatchObject({
            animation: false,
            tooltip: {
                transitionDuration: 0,
                axisPointer: { animation: false },
            },
        })
    })
})

describe('withMinimumParts', () => {
    const close = (actual: number[], expected: number[]) => {
        expect(actual).toHaveLength(expected.length)
        actual.forEach((value, index) => {
            expect(value).toBeCloseTo(expected[index] ?? NaN, 6)
        })
    }

    it('lifts thin parts and takes the extra from the biggest one', () => {
        // 300 / 1 / 10 with a minimum of 4: organic lifted by 3, existing pays
        close(withMinimumParts([300, 1, 10], 4), [297, 4, 10])
    })

    it('keeps parts that are already tall enough', () => {
        close(withMinimumParts([300, 10, 8], 4), [300, 10, 8])
    })

    it('lets the next biggest part pay when the biggest runs out', () => {
        // true 8, 8, 1, 1 -> 4, 6, 4, 4: the bar keeps its 18
        close(withMinimumParts([8, 8, 1, 1], 4), [4, 6, 4, 4])
    })

    it('grows only a bar too short for the minimum per part', () => {
        close(withMinimumParts([1, 1, 1], 4), [4, 4, 4])
    })

    it('never draws a part of 0', () => {
        close(withMinimumParts([250, 0, 0], 4), [250, 0, 0])
    })

    it('keeps the true bar total whenever the bar is tall enough', () => {
        const values = [331, 2, 1]
        const drawn = withMinimumParts(values, 5.8)
        expect(drawn.reduce((a, b) => a + b, 0)).toBeCloseTo(334, 6)
        expect(Math.min(...drawn.filter((v) => v > 0))).toBeCloseTo(5.8, 6)
    })
})

describe('toBarOption with the minimum part height', () => {
    it('draws a 1-client part at least 4px tall, the bar at its true height', () => {
        // axis 0..400 on the inner plot (320px minus 16px top, 28px bottom)
        const pxPerValue = (BAR_CHART_PLOT_HEIGHT - 16 - 28) / 400
        const tall = toBarOption({
            categories: ['Jul'],
            series: [
                { name: 'Existing', values: [331], color: '#111111' },
                { name: 'Organic', values: [2], color: '#222222' },
                { name: 'Paid', values: [1], color: '#333333' },
            ],
            yAxis: { max: 400, step: 100 },
            animate: false,
            tooltip: () => '',
        })
        const drawn = (Array.isArray(tall.series) ? tall.series : []).map(
            (item) =>
                read(
                    Array.isArray(item.data) ? item.data[0] : undefined,
                    'value'
                )
        )
        const px = drawn.map((value) =>
            typeof value === 'number' ? value * pxPerValue : NaN
        )

        expect(px[1]).toBeCloseTo(MIN_PART_PX, 6)
        expect(px[2]).toBeCloseTo(MIN_PART_PX, 6)
        expect(px.reduce((a, b) => a + b, 0)).toBeCloseTo(334 * pxPerValue, 6)
    })
})

describe('describeCategory', () => {
    it('reads the category, every series and the total', () => {
        expect(describeCategory('Feb', SERIES, 1, 'Total')).toBe(
            'Feb: Base 20, Middle 5, Top 0, Total 25'
        )
    })
})

describe('tooltipHtml', () => {
    it('lists every series and the total last', () => {
        const html = tooltipHtml('Feb', SERIES, 1, 'Total')
        expect(html.indexOf('Base')).toBeLessThan(html.indexOf('Top'))
        expect(html.lastIndexOf('Total')).toBeGreaterThan(html.indexOf('Top'))
        expect(html).toContain('>25<')
    })

    it('escapes names from data', () => {
        const html = tooltipHtml(
            '<b>Feb</b>',
            [
                {
                    name: '<img src=x onerror=alert(1)>',
                    values: [1],
                    color: '#000000',
                },
            ],
            0,
            'Total'
        )
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
        expect(html).toContain('&lt;b&gt;Feb&lt;/b&gt;')
    })
})

describe('escapeHtml', () => {
    it('escapes the five HTML characters', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
            '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
        )
    })
})

describe('stepCategory', () => {
    it.each([
        [0, 'ArrowRight', 1],
        [0, 'ArrowUp', 1],
        [2, 'ArrowLeft', 1],
        [2, 'ArrowDown', 1],
        [5, 'Home', 0],
        [0, 'End', 11],
        // no wrap at either end
        [11, 'ArrowRight', 11],
        [0, 'ArrowLeft', 0],
        // no active month: count from the first
        [undefined, 'ArrowRight', 1],
        [undefined, 'ArrowLeft', 0],
        [undefined, 'End', 11],
    ] as const)('%s + %s -> %s', (current, key, expected) => {
        expect(stepCategory(current, key, 12)).toBe(expected)
    })

    it('ignores other keys', () => {
        expect(stepCategory(3, 'Tab', 12)).toBeUndefined()
        expect(stepCategory(3, ' ', 12)).toBeUndefined()
    })
})
