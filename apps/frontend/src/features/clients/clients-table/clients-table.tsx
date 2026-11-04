import type { Company } from '@nevis/api-contract/model'
import { formatMonth } from '@nevis/utils'

export type ClientsTableProps = {
    months: readonly string[]
    company: Company
}

// TODO(Phase 5): tree table (toTableTree + ui/table, expand / collapse).
// Stand-in: the Company's stored values per month, wrapping instead of
// scrolling, so the loaded state of the card shows real data at any width.
export const ClientsTable = ({ months, company }: ClientsTableProps) => (
    <div className="p-6">
        <h3 className="font-medium">{company.name}</h3>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            {months.map((month, index) => (
                <div key={month} className="flex flex-col">
                    <dt className="text-muted">{formatMonth(month)}</dt>
                    <dd>{company.values[index]}</dd>
                </div>
            ))}
        </dl>
    </div>
)
