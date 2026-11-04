// Pure parts of the bar chart: geometry in px, month text, keyboard steps.
// No DOM, no React, unit-tested.

export type BarChartSeries = {
    name: string
    values: readonly number[]
    // any CSS colour, e.g. a design token: 'var(--color-series-existing)'
    color: string
}

// Plot height in px. Here, not in bar-chart.tsx: a loading placeholder can
// use it without pulling in the chart.
export const BAR_CHART_PLOT_HEIGHT = 320

// room around the bars: y labels on the left, month labels below
export const PLOT_INSETS = { left: 40, right: 8, top: 16, bottom: 28 }

// px between 0 and the axis top: fixed, so px convert exactly to values
const PLOT_INNER_HEIGHT =
    BAR_CHART_PLOT_HEIGHT - PLOT_INSETS.top - PLOT_INSETS.bottom

// share of each month's slot left empty between bars
const BAR_GAP_RATIO = 0.2

// rounded outer corners of each bar
const RADIUS = 4

// every non-zero part is drawn at least this tall, so 1 client is visible
export const MIN_PART_PX = 4

// space kept between two month labels, and between a bar and its tooltip
export const LABEL_GAP_PX = 8
export const TOOLTIP_GAP_PX = 8

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

// One drawn part of a stacked bar, in px from the plot's top left corner.
// `top` / `bottom`: corner radius of that edge (only the outer ends of a bar).
export type BarPart = {
    seriesIndex: number
    x: number
    y: number
    width: number
    height: number
    top: number
    bottom: number
}

// one month: its slot (for hover and the highlight) and its drawn parts
export type BarSlot = {
    left: number
    width: number
    center: number
    parts: BarPart[]
}

export type BarLayout = {
    slots: BarSlot[]
    // y axis lines and labels, 0 at the bottom
    ticks: { value: number; y: number }[]
    // top and height of the area the bars live in
    innerTop: number
    innerHeight: number
}

export type BarLayoutInput = {
    // plot width in px
    width: number
    categoryCount: number
    series: readonly BarChartSeries[]
    yAxis: { max: number; step: number }
}

// Where every bar part, tick and month slot goes for a plot `width` px wide
// and BAR_CHART_PLOT_HEIGHT tall. Parts stack bottom up in series order;
// parts of 0 are left out; the lowest and highest part of a bar get the
// rounded corners, so each bar reads as one block.
export const layoutBars = ({
    width,
    categoryCount,
    series,
    yAxis,
}: BarLayoutInput): BarLayout => {
    const innerWidth = Math.max(0, width - PLOT_INSETS.left - PLOT_INSETS.right)
    const slotWidth = categoryCount > 0 ? innerWidth / categoryCount : 0
    const barWidth = slotWidth * (1 - BAR_GAP_RATIO)
    const pxPerValue = yAxis.max > 0 ? PLOT_INNER_HEIGHT / yAxis.max : 0
    const minValue = pxPerValue > 0 ? MIN_PART_PX / pxPerValue : 0
    const bottom = PLOT_INSETS.top + PLOT_INNER_HEIGHT

    const slots = Array.from({ length: categoryCount }, (_, index) => {
        const left = PLOT_INSETS.left + index * slotWidth
        const x = left + (slotWidth - barWidth) / 2
        const drawn = withMinimumParts(
            series.map((item) => valueAt(item, index)),
            minValue
        )
        let y = bottom
        const stacked: Omit<BarPart, 'top' | 'bottom'>[] = []
        drawn.forEach((value, seriesIndex) => {
            const height = value * pxPerValue
            if (height > 0) {
                y -= height
                stacked.push({ seriesIndex, x, y, width: barWidth, height })
            }
        })
        const parts = stacked.map((part, position) => ({
            ...part,
            top: position === stacked.length - 1 ? RADIUS : 0,
            bottom: position === 0 ? RADIUS : 0,
        }))
        return { left, width: slotWidth, center: left + slotWidth / 2, parts }
    })

    const steps = yAxis.step > 0 ? Math.floor(yAxis.max / yAxis.step) : 0
    const ticks = Array.from({ length: steps + 1 }, (_, step) => {
        const value = step * yAxis.step
        return { value, y: bottom - value * pxPerValue }
    })

    return {
        slots,
        ticks,
        innerTop: PLOT_INSETS.top,
        innerHeight: PLOT_INNER_HEIGHT,
    }
}

// a path coordinate, at most 2 decimals
const num = (value: number): string => String(Math.round(value * 100) / 100)

// SVG path of a rectangle with rounded top and / or bottom corners. A radius
// never exceeds half the width, nor the height it has to share with the
// other edge, so thin parts stay rectangles with soft ends.
export const barPartPath = ({
    x,
    y,
    width,
    height,
    top,
    bottom,
}: Omit<BarPart, 'seriesIndex'>): string => {
    const rt = Math.min(top, width / 2, bottom > 0 ? height / 2 : height)
    const rb = Math.min(bottom, width / 2, top > 0 ? height / 2 : height)
    const arc = (r: number, dx: number, dy: number) =>
        r > 0 ? `a${num(r)},${num(r)} 0 0 1 ${num(dx)},${num(dy)}` : ''
    return [
        `M${num(x)},${num(y + rt)}`,
        arc(rt, rt, -rt),
        `h${num(width - 2 * rt)}`,
        arc(rt, rt, rt),
        `v${num(height - rt - rb)}`,
        arc(rb, -rb, rb),
        `h${num(-(width - 2 * rb))}`,
        arc(rb, -rb, -rb),
        'Z',
    ].join('')
}

// Show every n-th month label so labels keep LABEL_GAP_PX between them:
// 1 = all of them. Labels are centred on their slot, so two shown labels are
// n slots apart.
export const labelInterval = (slotWidth: number, labelWidth: number): number =>
    slotWidth > 0
        ? Math.max(1, Math.ceil((labelWidth + LABEL_GAP_PX) / slotWidth))
        : 1

// the month under the pointer, or undefined outside the bars' area
export const categoryAt = (
    x: number,
    slots: readonly BarSlot[]
): number | undefined => {
    const index = slots.findIndex(
        (slot) => x >= slot.left && x < slot.left + slot.width
    )
    return index === -1 ? undefined : index
}

// Left edge of the tooltip: right of the bar if it fits, else left of it,
// else as close to the bar as the plot allows. Never outside the plot (the
// card clips what is outside).
export const tooltipLeft = (
    slot: Pick<BarSlot, 'left' | 'width'>,
    tooltipWidth: number,
    plotWidth: number
): number => {
    const right = slot.left + slot.width + TOOLTIP_GAP_PX
    if (right + tooltipWidth <= plotWidth) {
        return right
    }
    const left = slot.left - TOOLTIP_GAP_PX - tooltipWidth
    if (left >= 0) {
        return left
    }
    const centred = slot.left + slot.width / 2 - tooltipWidth / 2
    return Math.max(0, Math.min(centred, plotWidth - tooltipWidth))
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
