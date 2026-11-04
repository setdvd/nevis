import type { Company } from '@nevis/api-contract/model'
import { formatMonth } from '@nevis/utils'
import { lazy, Suspense, useMemo } from 'react'

import {
    barTotals,
    seriesColors,
    toChartSeries,
    yAxisFor,
} from './chart-series'
import { ClientsChartSkeleton } from './clients-chart-skeleton'

// ECharts is a separate chunk. Its download starts when this module loads, in
// parallel with the data request, so the chart does not wait for it after the
// data arrives; the table never waits for it.
const barChartModule = import('../../../ui/bar-chart/bar-chart')
const BarChart = lazy(async () => {
    const { BarChart: component } = await barChartModule
    return { default: component }
})

const TITLE = 'Clients per month'
const DESCRIPTION = 'Use arrow keys to read each month. Data table follows.'

export type ClientsChartProps = {
    months: readonly string[]
    company: Company
}

// one stacked bar per month: existing + new-client channels, total = Company value
export const ClientsChart = ({ months, company }: ClientsChartProps) => {
    // once per data: the chart gets stable props and sets its option only then
    const chart = useMemo(() => {
        const series = toChartSeries(company)
        const colors = seriesColors(series)
        const categories = months.map(formatMonth)
        return {
            categories,
            series: series.map((item, index) => ({
                ...item,
                color: colors[index] ?? '#000000',
            })),
            yAxis: yAxisFor(Math.max(0, ...barTotals(series))),
            labels: {
                chart: `${TITLE}, ${categories.at(0) ?? ''} to ${categories.at(-1) ?? ''}`,
                total: 'Total',
                table: TITLE,
                category: 'Month',
            },
        }
    }, [months, company])

    return (
        <div className="p-6">
            <Suspense fallback={<ClientsChartSkeleton framed={false} />}>
                <BarChart
                    categories={chart.categories}
                    series={chart.series}
                    yAxis={chart.yAxis}
                    description={DESCRIPTION}
                    labels={chart.labels}
                />
            </Suspense>
        </div>
    )
}
