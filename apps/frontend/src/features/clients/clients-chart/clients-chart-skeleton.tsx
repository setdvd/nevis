import { BAR_CHART_PLOT_HEIGHT } from '../../../ui/bar-chart/bar-chart-model'
import { Skeleton } from '../../../ui/skeleton/skeleton'

// rough bar heights, so the placeholder reads as a chart
const BAR_HEIGHTS = [
    'h-[62%]',
    'h-[66%]',
    'h-[70%]',
    'h-[74%]',
    'h-[78%]',
    'h-[82%]',
    'h-[86%]',
    'h-[62%]',
    'h-[62%]',
    'h-[62%]',
    'h-[62%]',
    'h-[86%]',
]

// Same layout and height as the chart card: padding, plot + 16px gap + one
// legend line, so nothing moves when the data arrives.
export const ClientsChartSkeleton = () => (
    <div aria-hidden="true" className="flex flex-col gap-4 p-6">
        <div
            className="flex items-end gap-2 sm:gap-6"
            style={{ height: BAR_CHART_PLOT_HEIGHT }}
        >
            {BAR_HEIGHTS.map((height, index) => (
                <div key={index} className={`flex flex-1 ${height}`}>
                    <Skeleton size="h-full w-full" />
                </div>
            ))}
        </div>
        <div className="flex h-4 items-center justify-center gap-4">
            <Skeleton size="h-3 w-24" />
            <Skeleton size="h-3 w-20" />
            <Skeleton size="h-3 w-16" />
        </div>
    </div>
)
