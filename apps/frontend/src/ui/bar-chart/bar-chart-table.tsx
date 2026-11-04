import { totalAt, valueAt } from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'

export type BarChartTableProps = {
    caption: string
    categoryLabel: string
    totalLabel: string
    categories: readonly string[]
    series: readonly BarChartSeries[]
    formatValue: (value: number) => string
}

// The chart's numbers for screen readers: one row per category, one column
// per series, Total last. Visually hidden; the drawing itself is aria-hidden.
export const BarChartTable = ({
    caption,
    categoryLabel,
    totalLabel,
    categories,
    series,
    formatValue,
}: BarChartTableProps) => (
    <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
            <tr>
                <th scope="col">{categoryLabel}</th>
                {series.map(({ name }) => (
                    <th key={name} scope="col">
                        {name}
                    </th>
                ))}
                <th scope="col">{totalLabel}</th>
            </tr>
        </thead>
        <tbody>
            {categories.map((category, index) => (
                <tr key={category}>
                    <th scope="row">{category}</th>
                    {series.map((item) => (
                        <td key={item.name}>
                            {formatValue(valueAt(item, index))}
                        </td>
                    ))}
                    <td>{formatValue(totalAt(series, index))}</td>
                </tr>
            ))}
        </tbody>
    </table>
)
