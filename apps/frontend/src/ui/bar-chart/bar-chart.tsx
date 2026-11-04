import { useId, useState } from 'react'

import { BarChartLegend } from './bar-chart-legend'
import { describeCategory } from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'
import { BarChartPlot } from './bar-chart-plot'
import { BarChartTable } from './bar-chart-table'
import { BarChartTooltip } from './bar-chart-tooltip'
import { useCategoryKeyboard } from './use-category-keyboard'

export type BarChartProps = {
    categories: readonly string[]
    series: readonly BarChartSeries[]
    yAxis: { max: number; step: number }
    // keyboard hint, read with the chart
    description: string
    // numbers in the tooltip, the value text and the data table (locale)
    formatValue?: (value: number) => string
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
    formatValue = String,
    labels,
}: BarChartProps) => {
    const descriptionId = useId()
    // the category whose tooltip shows: the keyboard's or the pointer's,
    // whichever moved last
    const [tooltipAt, setTooltipAt] = useState<number | undefined>()

    const keyboard = useCategoryKeyboard({
        count: categories.length,
        show: setTooltipAt,
        hide: () => {
            setTooltipAt(undefined)
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
                    labels.total,
                    formatValue
                )}
                onKeyDown={keyboard.onKeyDown}
                onFocus={keyboard.onFocus}
                onBlur={keyboard.onBlur}
                className="rounded outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-focus"
            >
                <BarChartPlot
                    categories={categories}
                    series={series}
                    yAxis={yAxis}
                    active={tooltipAt}
                    onPointerCategory={setTooltipAt}
                    tooltip={
                        tooltipAt !== undefined && (
                            <BarChartTooltip
                                category={categories[tooltipAt] ?? ''}
                                series={series}
                                index={tooltipAt}
                                totalLabel={labels.total}
                                formatValue={formatValue}
                            />
                        )
                    }
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
                formatValue={formatValue}
            />
        </div>
    )
}
