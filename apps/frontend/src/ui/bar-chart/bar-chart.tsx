import { BarChart as EChartsBar } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsType } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import EChartsReactCore from 'echarts-for-react/esm/core'
import { useId, useMemo, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'

import { BarChartLegend } from './bar-chart-legend'
import {
    BAR_CHART_PLOT_HEIGHT,
    describeCategory,
    stepCategory,
    toBarOption,
    tooltipHtml,
} from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'
import { BarChartTable } from './bar-chart-table'
import { useReducedMotion } from './use-reduced-motion'

// Tree-shaken: only the bar chart, grid, tooltip and the SVG renderer
// (36 bars: few elements, sharp at any size, no canvas re-raster on resize).
echarts.use([EChartsBar, GridComponent, TooltipComponent, SVGRenderer])

const OPTS = { renderer: 'svg' } as const

export type BarChartProps = {
    categories: readonly string[]
    series: readonly BarChartSeries[]
    yAxis: { max: number; step: number }
    // keyboard hint, read with the chart
    description: string
    labels: {
        // accessible name of the chart, e.g. "Clients per month, Feb 2024 to Jan 2025"
        chart: string
        total: string
        // caption of the data table for screen readers
        table: string
        // header of the category column in that table, e.g. "Month"
        category: string
    }
}

// Stacked bar chart. For keyboard and screen readers it is one control, like
// a slider over the categories: arrow keys / Home / End step through them and
// show the tooltip; the value is the category text (same words as the
// tooltip). The drawing is hidden from screen readers; a data table follows.
export const BarChart = ({
    categories,
    series,
    yAxis,
    description,
    labels,
}: BarChartProps) => {
    const descriptionId = useId()
    const reducedMotion = useReducedMotion()
    const chartRef = useRef<EChartsType | null>(null)
    // the keyboard's category; undefined = none yet (pointer hover has its own)
    const [active, setActive] = useState<number | undefined>()

    // stable between renders: echarts-for-react calls setOption only when the
    // option changes, not on every keyboard step
    const option = useMemo(
        () =>
            toBarOption({
                categories,
                series,
                yAxis,
                animate: !reducedMotion,
                tooltip: (index) =>
                    tooltipHtml(
                        categories[index] ?? '',
                        series,
                        index,
                        labels.total
                    ),
            }),
        [categories, series, yAxis, reducedMotion, labels.total]
    )

    const showTip = (index: number) => {
        chartRef.current?.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: index,
        })
    }
    const hideTip = () => {
        chartRef.current?.dispatchAction({ type: 'hideTip' })
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            // hide, but keep the month: the next step goes on from it
            hideTip()
            return
        }
        const next = stepCategory(active, event.key, categories.length)
        if (next === undefined) {
            return
        }
        // the keys step the chart, they do not scroll the page
        event.preventDefault()
        setActive(next)
        showTip(next)
    }

    // Keyboard focus starts at the first category and shows it at once. A
    // click or tap also focuses the chart but does not jump: the pointer
    // shows its own tooltip.
    const onFocus = (event: FocusEvent<HTMLDivElement>) => {
        if (event.currentTarget.matches(':focus-visible')) {
            setActive(0)
            showTip(0)
        }
    }

    // leaving ends the keyboard session: the next focus starts at the first again
    const onBlur = () => {
        setActive(undefined)
        hideTip()
    }

    const current = active ?? 0

    return (
        <div className="flex flex-col gap-4">
            <div
                role="slider"
                tabIndex={0}
                aria-roledescription="chart"
                aria-label={labels.chart}
                aria-describedby={descriptionId}
                aria-valuemin={1}
                aria-valuemax={categories.length}
                aria-valuenow={current + 1}
                aria-valuetext={describeCategory(
                    categories[current] ?? '',
                    series,
                    current,
                    labels.total
                )}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                className="rounded outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-focus"
            >
                <div aria-hidden="true">
                    <EChartsReactCore
                        echarts={echarts}
                        option={option}
                        opts={OPTS}
                        style={{ height: BAR_CHART_PLOT_HEIGHT, width: '100%' }}
                        onChartReady={(instance) => {
                            chartRef.current = instance
                        }}
                    />
                </div>
            </div>
            <p id={descriptionId} className="sr-only">
                {description}
            </p>
            <BarChartLegend series={series} />
            <BarChartTable
                caption={labels.table}
                categoryLabel={labels.category}
                totalLabel={labels.total}
                categories={categories}
                series={series}
            />
        </div>
    )
}
