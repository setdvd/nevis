import { useMemo, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'

import {
    BAR_CHART_PLOT_HEIGHT,
    barPartPath,
    categoryAt,
    labelInterval,
    layoutBars,
    PLOT_INSETS,
    tooltipLeft,
} from './bar-chart-model'
import type { BarChartSeries, BarSlot } from './bar-chart-model'
import { useElementWidth } from './use-element-width'
import { useWidestLabel } from './use-widest-label'

export type BarChartPlotProps = {
    categories: readonly string[]
    series: readonly BarChartSeries[]
    yAxis: { max: number; step: number }
    // the month that is highlighted and shows `tooltip`
    active: number | undefined
    // the pointer is over a month, or (undefined) left the bars
    onPointerCategory: (index: number | undefined) => void
    // content of the active month's tooltip
    tooltip: ReactNode
}

type TooltipPositionProps = {
    slot: Pick<BarSlot, 'left' | 'width'>
    plotWidth: number
    children: ReactNode
}

// Puts the tooltip beside its bar and inside the plot. Its width is measured
// before the first paint, so it never shows at a guessed place. It jumps from
// month to month: a slide would also run from that guessed place on first show.
const TooltipPosition = ({
    slot,
    plotWidth,
    children,
}: TooltipPositionProps) => {
    const ref = useRef<HTMLDivElement>(null)
    const width = useElementWidth(ref)
    const left = tooltipLeft(slot, width, plotWidth)
    return (
        <div
            ref={ref}
            data-chart-tooltip=""
            className="pointer-events-none absolute top-1/2 left-0 z-10"
            style={{ transform: `translate(${String(left)}px, -50%)` }}
        >
            {children}
        </div>
    )
}

// crisp 1px lines: on the pixel grid, not between two pixels
const crisp = (y: number): number => Math.round(y) + 0.5

// The drawing, nothing else: dashed value lines with their labels, one
// stacked bar per month, month labels below (those that would overlap are
// left out), the highlight and tooltip of the active month. Plain SVG sized
// to its container. Hidden from screen readers: the chart's owner gives the
// accessible version.
export const BarChartPlot = ({
    categories,
    series,
    yAxis,
    active,
    onPointerCategory,
    tooltip,
}: BarChartPlotProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<SVGGElement>(null)
    const width = useElementWidth(containerRef)
    const widestLabel = useWidestLabel(labelsRef, categories, width > 0)

    const layout = useMemo(
        () =>
            layoutBars({
                width,
                categoryCount: categories.length,
                series,
                yAxis,
            }),
        [width, categories.length, series, yAxis]
    )
    const every =
        widestLabel === undefined
            ? 1
            : labelInterval(layout.slots[0]?.width ?? 0, widestLabel)
    const activeSlot = active === undefined ? undefined : layout.slots[active]
    const bottom = layout.innerTop + layout.innerHeight

    const pointAt = (event: PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect()
        onPointerCategory(categoryAt(event.clientX - box.left, layout.slots))
    }

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="relative touch-pan-y"
            style={{ height: BAR_CHART_PLOT_HEIGHT }}
            onPointerMove={pointAt}
            onPointerDown={pointAt}
            onPointerLeave={(event) => {
                // a tap keeps its tooltip; leaving the chart (blur) hides it
                if (event.pointerType !== 'touch') {
                    onPointerCategory(undefined)
                }
            }}
        >
            {width > 0 && (
                <svg
                    width={width}
                    height={BAR_CHART_PLOT_HEIGHT}
                    className="block overflow-visible text-xs"
                >
                    {layout.ticks.map((tick) => (
                        <g key={tick.value}>
                            <line
                                x1={PLOT_INSETS.left}
                                x2={width - PLOT_INSETS.right}
                                y1={crisp(tick.y)}
                                y2={crisp(tick.y)}
                                strokeDasharray="2 4"
                                className="stroke-line"
                            />
                            <text
                                x={PLOT_INSETS.left - 8}
                                y={tick.y}
                                dy="0.32em"
                                textAnchor="end"
                                className="fill-muted"
                            >
                                {tick.value}
                            </text>
                        </g>
                    ))}
                    {layout.slots.map((slot, index) => (
                        <g key={categories[index] ?? index}>
                            {slot.parts.map((part) => (
                                <path
                                    key={part.seriesIndex}
                                    d={barPartPath(part)}
                                    style={{
                                        fill: series[part.seriesIndex]?.color,
                                    }}
                                />
                            ))}
                        </g>
                    ))}
                    {activeSlot !== undefined && (
                        <rect
                            x={activeSlot.left}
                            y={layout.innerTop}
                            width={activeSlot.width}
                            height={layout.innerHeight}
                            className="fill-ink/4"
                        />
                    )}
                    <g ref={labelsRef}>
                        {layout.slots.map(
                            (slot, index) =>
                                index % every === 0 && (
                                    <text
                                        key={categories[index] ?? index}
                                        x={slot.center}
                                        y={bottom + 8}
                                        dy="0.71em"
                                        textAnchor="middle"
                                        className="fill-muted"
                                    >
                                        {categories[index]}
                                    </text>
                                )
                        )}
                    </g>
                </svg>
            )}
            {activeSlot !== undefined && (
                <TooltipPosition slot={activeSlot} plotWidth={width}>
                    {tooltip}
                </TooltipPosition>
            )}
        </div>
    )
}
