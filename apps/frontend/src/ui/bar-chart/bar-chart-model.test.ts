import { describe, expect, it } from 'vitest'

import {
    BAR_CHART_PLOT_HEIGHT,
    barPartPath,
    categoryAt,
    describeCategory,
    labelInterval,
    layoutBars,
    MIN_PART_PX,
    PLOT_INSETS,
    stepCategory,
    tooltipLeft,
    withMinimumParts,
} from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'

const SERIES: BarChartSeries[] = [
    { name: 'Base', values: [10, 20, 0], color: '#111111' },
    { name: 'Middle', values: [0, 5, 0], color: '#222222' },
    { name: 'Top', values: [3, 0, 4], color: '#333333' },
]

// 300px of bars: three slots of 100px, bars 80px wide
const WIDTH = PLOT_INSETS.left + 300 + PLOT_INSETS.right
const INNER_HEIGHT =
    BAR_CHART_PLOT_HEIGHT - PLOT_INSETS.top - PLOT_INSETS.bottom
const BOTTOM = PLOT_INSETS.top + INNER_HEIGHT

const layout = layoutBars({
    width: WIDTH,
    categoryCount: 3,
    series: SERIES,
    yAxis: { max: 100, step: 25 },
})

const close = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(expected.length)
    actual.forEach((value, index) => {
        expect(value).toBeCloseTo(expected[index] ?? NaN, 6)
    })
}

describe('layoutBars', () => {
    it('gives each category an equal slot and a bar 80% of it, centred', () => {
        expect(layout.slots.map((slot) => slot.left)).toEqual([40, 140, 240])
        expect(layout.slots.map((slot) => slot.center)).toEqual([90, 190, 290])
        const bar = layout.slots[0]?.parts[0]
        expect(bar?.x).toBeCloseTo(50, 6)
        expect(bar?.width).toBeCloseTo(80, 6)
    })

    it('stacks the parts bottom up in series order and leaves out parts of 0', () => {
        // Jan: Base 10 and Top 3, Middle is 0
        const parts = layout.slots[0]?.parts ?? []
        expect(parts.map((part) => part.seriesIndex)).toEqual([0, 2])
        const pxPerValue = INNER_HEIGHT / 100
        close(
            parts.map((part) => part.height),
            [10 * pxPerValue, 3 * pxPerValue]
        )
        // each part sits on the one below, the first on the axis
        expect(parts[0]?.y).toBeCloseTo(BOTTOM - 10 * pxPerValue, 6)
        expect(parts[1]?.y).toBeCloseTo(BOTTOM - 13 * pxPerValue, 6)
    })

    it('rounds the outer corners of each bar only', () => {
        const corners = (index: number) =>
            (layout.slots[index]?.parts ?? []).map(({ top, bottom }) => [
                top,
                bottom,
            ])
        // Jan: Base at the bottom, Top on top
        expect(corners(0)).toEqual([
            [0, 4],
            [4, 0],
        ])
        // Feb: Base, then Middle on top
        expect(corners(1)).toEqual([
            [0, 4],
            [4, 0],
        ])
        // Mar: only Top -> all four corners
        expect(corners(2)).toEqual([[4, 4]])
    })

    it('places a line per step, 0 at the bottom', () => {
        expect(layout.ticks.map((tick) => tick.value)).toEqual([
            0, 25, 50, 75, 100,
        ])
        expect(layout.ticks[0]?.y).toBeCloseTo(BOTTOM, 6)
        expect(layout.ticks.at(-1)?.y).toBeCloseTo(PLOT_INSETS.top, 6)
    })

    it('draws a 1-client part at least 4px tall, the bar at its true height', () => {
        const tall = layoutBars({
            width: WIDTH,
            categoryCount: 1,
            series: [
                { name: 'Existing', values: [331], color: '#111111' },
                { name: 'Organic', values: [2], color: '#222222' },
                { name: 'Paid', values: [1], color: '#333333' },
            ],
            yAxis: { max: 400, step: 100 },
        })
        const heights = (tall.slots[0]?.parts ?? []).map((part) => part.height)

        expect(heights[1]).toBeCloseTo(MIN_PART_PX, 6)
        expect(heights[2]).toBeCloseTo(MIN_PART_PX, 6)
        expect(heights.reduce((a, b) => a + b, 0)).toBeCloseTo(
            (334 * INNER_HEIGHT) / 400,
            6
        )
    })

    it('draws nothing wide before the plot width is known', () => {
        const none = layoutBars({
            width: 0,
            categoryCount: 3,
            series: SERIES,
            yAxis: { max: 100, step: 25 },
        })
        expect(none.slots.map((slot) => slot.width)).toEqual([0, 0, 0])
    })
})

describe('barPartPath', () => {
    it('draws a plain rectangle without corners', () => {
        expect(
            barPartPath({
                x: 0,
                y: 0,
                width: 10,
                height: 20,
                top: 0,
                bottom: 0,
            })
        ).toBe('M0,0h10v20h-10Z')
    })

    it('rounds only the edges asked for', () => {
        expect(
            barPartPath({
                x: 0,
                y: 0,
                width: 10,
                height: 20,
                top: 4,
                bottom: 0,
            })
        ).toBe('M0,4a4,4 0 0 1 4,-4h2a4,4 0 0 1 4,4v16h-10Z')
        expect(
            barPartPath({
                x: 0,
                y: 0,
                width: 10,
                height: 20,
                top: 0,
                bottom: 4,
            })
        ).toBe('M0,0h10v16a4,4 0 0 1 -4,4h-2a4,4 0 0 1 -4,-4Z')
    })

    it('never uses a radius bigger than the part allows', () => {
        // 3px tall with both ends rounded: each end gets half the height
        expect(
            barPartPath({ x: 0, y: 0, width: 10, height: 3, top: 4, bottom: 4 })
        ).toBe(
            'M0,1.5a1.5,1.5 0 0 1 1.5,-1.5h7a1.5,1.5 0 0 1 1.5,1.5v0a1.5,1.5 0 0 1 -1.5,1.5h-7a1.5,1.5 0 0 1 -1.5,-1.5Z'
        )
        // 6px wide: at most 3
        expect(
            barPartPath({ x: 0, y: 0, width: 6, height: 20, top: 4, bottom: 0 })
        ).toBe('M0,3a3,3 0 0 1 3,-3h0a3,3 0 0 1 3,3v17h-6Z')
    })
})

describe('labelInterval', () => {
    it.each([
        // slot, widest label -> every n-th label
        [100, 50, 1],
        [58, 50, 1],
        [57, 50, 2],
        // 375px window: 12 slots of ~20.6px, "Feb 2024" ~50px
        [20.6, 50, 3],
        [0, 50, 1],
    ])('slot %fpx, label %fpx -> every %i', (slot, label, every) => {
        expect(labelInterval(slot, label)).toBe(every)
    })
})

describe('categoryAt', () => {
    it.each([
        [40, 0],
        [139.9, 0],
        [140, 1],
        [339.9, 2],
        // the y labels and the right edge are outside every bar's slot
        [39, undefined],
        [340, undefined],
    ])('x %f -> %s', (x, expected) => {
        expect(categoryAt(x, layout.slots)).toBe(expected)
    })
})

describe('tooltipLeft', () => {
    it('puts the tooltip right of the bar when it fits', () => {
        expect(tooltipLeft({ left: 40, width: 100 }, 180, 1000)).toBe(148)
    })

    it('puts it left of the bar near the right edge', () => {
        expect(tooltipLeft({ left: 800, width: 100 }, 180, 1000)).toBe(612)
    })

    it('keeps it inside a narrow plot, as close to the bar as it can', () => {
        expect(tooltipLeft({ left: 120, width: 20 }, 180, 300)).toBe(40)
        // centred would end past the right edge: flush with it instead
        expect(tooltipLeft({ left: 150, width: 20 }, 180, 200)).toBe(20)
    })
})

describe('withMinimumParts', () => {
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

describe('describeCategory', () => {
    it('reads the category, every series and the total', () => {
        expect(describeCategory('Feb', SERIES, 1, 'Total', String)).toBe(
            'Feb: Base 20, Middle 5, Top 0, Total 25'
        )
    })

    it('formats the numbers with the given formatter', () => {
        const big: BarChartSeries[] = [
            { name: 'A', values: [1234], color: '#111111' },
            { name: 'B', values: [5000], color: '#222222' },
        ]
        const de = new Intl.NumberFormat('de-DE')
        expect(
            describeCategory('Mai', big, 0, 'Summe', (n) => de.format(n))
        ).toBe('Mai: A 1.234, B 5.000, Summe 6.234')
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
