import type { BarSeriesOption } from 'echarts/charts'
import type {
    GridComponentOption,
    TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

// Pure parts of the bar chart: no DOM, no ECharts runtime, unit-tested.

export type BarChartSeries = {
    name: string
    values: readonly number[]
    // a real colour (#rrggbb): ECharts cannot resolve CSS variables
    color: string
}

export type BarChartOption = ComposeOption<
    BarSeriesOption | GridComponentOption | TooltipComponentOption
>

const RADIUS = 4

// Plot height in px. Here, not in bar-chart.tsx: a loading placeholder can
// use it without pulling in the lazily loaded ECharts chunk.
export const BAR_CHART_PLOT_HEIGHT = 320

const GRID = { left: 40, right: 8, top: 16, bottom: 28 }

// px between 0 and the axis top: fixed, so px convert exactly to values
const PLOT_INNER_HEIGHT = BAR_CHART_PLOT_HEIGHT - GRID.top - GRID.bottom

// every non-zero part is drawn at least this tall, so 1 client is visible
export const MIN_PART_PX = 4

// Heights to draw for one bar, in value units. Parts above 0 but below `min`
// are lifted to `min`; the extra is taken from the biggest part, then the next
// biggest, none going below `min`, so the bar keeps its true total. Only a bar
// too short for `min` per part grows, to exactly `min` per part. Parts of 0
// stay 0. The real values stay in the tooltip and the data table.
export const withMinimumParts = (
    values: readonly number[],
    min: number
): number[] => {
    const drawn = values.map((value) => (value > 0 ? Math.max(value, min) : 0))
    let excess =
        drawn.reduce((sum, value) => sum + value, 0) -
        values.reduce((sum, value) => sum + value, 0)
    // biggest first; equal parts in series order
    const order = values
        .map((value, index) => ({ value, index }))
        .filter(({ value }) => value > min)
        .sort((a, b) => b.value - a.value || a.index - b.index)
    for (const { index } of order) {
        if (excess <= 0) {
            break
        }
        const current = drawn[index] ?? 0
        const give = Math.min(excess, current - min)
        drawn[index] = current - give
        excess -= give
    }
    return drawn
}

export const valueAt = (series: BarChartSeries, index: number): number =>
    series.values[index] ?? 0

export const totalAt = (
    series: readonly BarChartSeries[],
    index: number
): number => series.reduce((sum, item) => sum + valueAt(item, index), 0)

// "Jul 2024: Existing clients 331, New organic 2, New paid 1, Total 334".
// One text for the tooltip and for screen readers, so both say the same.
// Numbers come formatted by the caller (locale); the ": " / ", " separators
// are fixed (see README, i18n).
export const describeCategory = (
    category: string,
    series: readonly BarChartSeries[],
    index: number,
    totalLabel: string,
    formatValue: (value: number) => string
): string => {
    const parts = series.map(
        (item) => `${item.name} ${formatValue(valueAt(item, index))}`
    )
    return `${category}: ${[...parts, `${totalLabel} ${formatValue(totalAt(series, index))}`].join(', ')}`
}

// Each bar looks like one block: the lowest and the highest non-zero part get
// the rounded outer corners; a part of 0 is not drawn (height 0).
const cornersFor = (
    series: readonly BarChartSeries[],
    seriesIndex: number,
    index: number
): [number, number, number, number] => {
    const visible = series
        .map((item, position) => (valueAt(item, index) > 0 ? position : -1))
        .filter((position) => position >= 0)
    const top = seriesIndex === visible.at(-1) ? RADIUS : 0
    const bottom = seriesIndex === visible.at(0) ? RADIUS : 0
    // ECharts order: top-left, top-right, bottom-right, bottom-left
    return [top, top, bottom, bottom]
}

export type BarOptionInput = {
    categories: readonly string[]
    series: readonly BarChartSeries[]
    yAxis: { max: number; step: number }
    animate: boolean
    // the tooltip content for one category (HTML)
    tooltip: (index: number) => string
}

const AXIS_TEXT = {
    color: '#6b6a65',
    fontFamily: 'Inter Variable',
    fontSize: 12,
}

export const toBarOption = ({
    categories,
    series,
    yAxis,
    animate,
    tooltip,
}: BarOptionInput): BarChartOption => {
    const min = (MIN_PART_PX * yAxis.max) / PLOT_INNER_HEIGHT
    // drawn[category][series]
    const drawn = categories.map((_, index) =>
        withMinimumParts(
            series.map((item) => valueAt(item, index)),
            min
        )
    )
    return {
        animation: animate,
        grid: GRID,
        xAxis: {
            type: 'category',
            data: [...categories],
            axisTick: { show: false },
            axisLine: { show: false },
            // 'auto' hides labels that would overlap (narrow screens)
            axisLabel: { ...AXIS_TEXT, interval: 'auto', hideOverlap: true },
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: yAxis.max,
            interval: yAxis.step,
            axisLabel: AXIS_TEXT,
            splitLine: { lineStyle: { color: '#ecebe6', type: [2, 4] } },
        },
        tooltip: {
            trigger: 'axis',
            // The pointer and the tooltip box animate on their own, apart
            // from `animation`: with reduced motion they jump, not slide.
            axisPointer: {
                type: 'shadow',
                shadowStyle: { color: 'rgba(20, 20, 19, 0.04)' },
                animation: animate,
            },
            transitionDuration: animate ? 0.4 : 0,
            // inside the chart: the card clips anything outside it
            confine: true,
            backgroundColor: '#ffffff',
            borderColor: '#d6d4cc',
            padding: [8, 12],
            textStyle: {
                color: '#141413',
                fontFamily: 'Inter Variable',
                fontSize: 12,
            },
            formatter: (params) => {
                const first = Array.isArray(params) ? params[0] : params
                return tooltip(first?.dataIndex ?? 0)
            },
        },
        series: series.map((item, seriesIndex) => ({
            type: 'bar',
            name: item.name,
            stack: 'total',
            barCategoryGap: '20%',
            itemStyle: { color: item.color },
            // hover shows the tooltip; colours stay as they are
            emphasis: { disabled: true },
            data: categories.map((_, index) => ({
                value: drawn[index]?.[seriesIndex] ?? 0,
                itemStyle: {
                    borderRadius: cornersFor(series, seriesIndex, index),
                },
            })),
        })),
    }
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

// series names come from data: never put them into tooltip HTML unescaped
export const escapeHtml = (text: string): string =>
    text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)

export const tooltipHtml = (
    category: string,
    series: readonly BarChartSeries[],
    index: number,
    totalLabel: string,
    formatValue: (value: number) => string
): string => {
    const row = (label: string, value: number, color?: string) =>
        `<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:160px">` +
        `<span style="display:flex;align-items:center;gap:6px">` +
        (color === undefined
            ? ''
            : `<span style="width:8px;height:8px;border-radius:2px;background:${escapeHtml(color)}"></span>`) +
        `${escapeHtml(label)}</span><span>${escapeHtml(formatValue(value))}</span></div>`
    return (
        `<div style="font-weight:500;margin-bottom:4px">${escapeHtml(category)}</div>` +
        series
            .map((item) => row(item.name, valueAt(item, index), item.color))
            .join('') +
        `<div style="border-top:1px solid #ecebe6;margin-top:4px;padding-top:4px;font-weight:500">${row(totalLabel, totalAt(series, index))}</div>`
    )
}

export type StepKey =
    'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

const isStepKey = (key: string): key is StepKey =>
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
        key
    )

// Keyboard month stepping like a slider: Right / Up next, Left / Down previous,
// Home / End first / last, no wrap. Without an active month it counts from the
// first. Returns undefined for keys it does not handle.
export const stepCategory = (
    current: number | undefined,
    key: string,
    count: number
): number | undefined => {
    if (!isStepKey(key) || count === 0) {
        return undefined
    }
    const from = current ?? 0
    const last = count - 1
    switch (key) {
        case 'ArrowRight':
        case 'ArrowUp':
            return Math.min(from + 1, last)
        case 'ArrowLeft':
        case 'ArrowDown':
            return Math.max(from - 1, 0)
        case 'Home':
            return 0
        case 'End':
            return last
    }
}
