import { totalAt, valueAt } from './bar-chart-model'
import type { BarChartSeries } from './bar-chart-model'

export type BarChartTooltipProps = {
    category: string
    series: readonly BarChartSeries[]
    index: number
    totalLabel: string
    formatValue: (value: number) => string
}

// One month: every series with its colour and value, the total last. Plain
// React text, so names from the data need no escaping. The plot places it.
export const BarChartTooltip = ({
    category,
    series,
    index,
    totalLabel,
    formatValue,
}: BarChartTooltipProps) => (
    <div className="min-w-40 rounded border border-line-strong bg-surface px-3 py-2 text-xs whitespace-nowrap text-ink shadow-md">
        <p className="mb-1 font-medium">{category}</p>
        <ul className="flex flex-col gap-0.5">
            {series.map((item) => (
                <li
                    key={item.name}
                    className="flex items-center justify-between gap-4"
                >
                    <span className="flex items-center gap-1.5">
                        <span
                            className="size-2 rounded-xs forced-colors:border forced-colors:border-[CanvasText]"
                            style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                    </span>
                    <span>{formatValue(valueAt(item, index))}</span>
                </li>
            ))}
        </ul>
        <p className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-medium">
            <span>{totalLabel}</span>
            <span>{formatValue(totalAt(series, index))}</span>
        </p>
    </div>
)
