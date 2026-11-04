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

// plot (12 bars) + legend line. TODO(Phase 6): match the real chart height exactly.
export const ClientsChartSkeleton = () => (
    <div aria-hidden="true" className="flex flex-col gap-4 p-6">
        <div className="flex h-80 items-end gap-2 sm:gap-6">
            {BAR_HEIGHTS.map((height, index) => (
                <div key={index} className={`flex flex-1 ${height}`}>
                    <Skeleton size="h-full w-full" />
                </div>
            ))}
        </div>
        <div className="flex justify-center gap-4">
            <Skeleton size="h-3 w-24" />
            <Skeleton size="h-3 w-20" />
            <Skeleton size="h-3 w-16" />
        </div>
    </div>
)
