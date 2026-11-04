import type { Company } from '@nevis/api-contract/model'
import { formatMonth } from '@nevis/utils'

export type ClientsChartProps = {
    months: readonly string[]
    company: Company
}

// TODO(Phase 6): stacked bar chart (toChartSeries + ui/bar-chart). Stand-in so
// the loaded state of the card can be built and checked first.
export const ClientsChart = ({ months, company }: ClientsChartProps) => (
    <p className="p-6 text-muted">
        {company.name}: chart for {formatMonth(months[0] ?? '')} to{' '}
        {formatMonth(months.at(-1) ?? '')} comes in Phase 6.
    </p>
)
