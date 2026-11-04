import { Skeleton } from '../../../ui/skeleton/skeleton'

const ROWS = 4
const MONTH_COLUMNS = 12

// header + 4 rows (Company and its branches at start).
// TODO(Phase 5): match the real table layout and height exactly.
export const ClientsTableSkeleton = () => (
    <div aria-hidden="true" className="overflow-hidden">
        {Array.from({ length: ROWS + 1 }, (_, row) => (
            <div
                key={row}
                className="flex h-14 items-center gap-6 border-b border-line px-6 last:border-b-0"
            >
                <div className="w-40 shrink-0">
                    {row > 0 && <Skeleton size="h-4 w-24" />}
                </div>
                {Array.from({ length: MONTH_COLUMNS }, (_, column) => (
                    <div
                        key={column}
                        className="flex min-w-12 flex-1 justify-end"
                    >
                        <Skeleton size={row === 0 ? 'h-3 w-14' : 'h-4 w-8'} />
                    </div>
                ))}
            </div>
        ))}
    </div>
)
