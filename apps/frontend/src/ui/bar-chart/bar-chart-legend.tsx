import type { BarChartSeries } from './bar-chart-model'

export type BarChartLegendProps = {
    series: readonly BarChartSeries[]
}

// A plain list, not buttons: hiding a series would make bars shorter than
// their totals. Wraps to more lines when there is no room.
export const BarChartLegend = ({ series }: BarChartLegendProps) => (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs leading-4 text-muted">
        {series.map(({ name, color }) => (
            <li key={name} className="flex items-center gap-1.5">
                {/* border: the swatch stays visible in forced colours */}
                <span
                    aria-hidden="true"
                    className="size-2 rounded-xs forced-colors:border forced-colors:border-[CanvasText]"
                    style={{ backgroundColor: color }}
                />
                {name}
            </li>
        ))}
    </ul>
)
