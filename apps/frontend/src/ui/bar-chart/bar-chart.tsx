import type { EChartsType } from 'echarts/core'
import { useId, useMemo, useRef } from 'react'

import { BarChartLegend } from './bar-chart-legend'
import { describeCategory, toBarOption, tooltipHtml } from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'
import { BarChartPlot } from './bar-chart-plot'
import { BarChartTable } from './bar-chart-table'
import { useCategoryKeyboard } from './use-category-keyboard'
import { useReducedMotion } from './use-reduced-motion'

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

// Stacked bar chart, composed of the plot, the legend and a data table. For
// keyboard and screen readers it is one control, like a slider over the
// categories; its value is the category text in the tooltip's words.
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

    const keyboard = useCategoryKeyboard({
        count: categories.length,
        show: (index) => {
            chartRef.current?.dispatchAction({
                type: 'showTip',
                seriesIndex: 0,
                dataIndex: index,
            })
        },
        hide: () => {
            chartRef.current?.dispatchAction({ type: 'hideTip' })
        },
    })
    const current = keyboard.active ?? 0

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
                onKeyDown={keyboard.onKeyDown}
                onFocus={keyboard.onFocus}
                onBlur={keyboard.onBlur}
                className="rounded outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-focus"
            >
                <BarChartPlot
                    option={option}
                    onReady={(instance) => {
                        chartRef.current = instance
                    }}
                />
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
