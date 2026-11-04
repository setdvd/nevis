import type { Company } from '@nevis/api-contract/model'
import { lazy, Suspense, useMemo } from 'react'

import { useI18n } from '../../../i18n/i18n-context'

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

export type ClientsChartProps = {
    months: readonly string[]
    company: Company
}

// one stacked bar per month: existing + new-client channels, total = Company value
export const ClientsChart = ({ months, company }: ClientsChartProps) => {
    const { messages, formatMonth, formatNumber } = useI18n()
    // once per data (and language): the chart gets stable props and sets its
    // option only then
    const chart = useMemo(() => {
        const series = toChartSeries(company)
        const colors = seriesColors(series)
        const categories = months.map((month) => formatMonth(month))
        return {
            categories,
            series: series.map((item, index) => ({
                name:
                    item.kind === 'existing'
                        ? messages.chart.existingClients
                        : item.name,
                values: item.values,
                color: colors[index] ?? '#000000',
            })),
            yAxis: yAxisFor(Math.max(0, ...barTotals(series))),
            labels: {
                chart: messages.chart.label(
                    categories.at(0) ?? '',
                    categories.at(-1) ?? ''
                ),
                total: messages.chart.total,
                table: messages.chart.title,
                category: messages.chart.month,
            },
        }
    }, [months, company, messages, formatMonth])

    return (
        <div className="p-6">
            <Suspense fallback={<ClientsChartSkeleton framed={false} />}>
                <BarChart
                    categories={chart.categories}
                    series={chart.series}
                    yAxis={chart.yAxis}
                    description={messages.chart.description}
                    formatValue={formatNumber}
                    labels={chart.labels}
                />
            </Suspense>
        </div>
    )
}
