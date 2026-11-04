import type { ClientsResponse } from '@nevis/api-contract/model'
import type { UseQueryResult } from '@tanstack/react-query'

import { ClientsCard } from '../clients-card/clients-card'
import { ClientsChart } from '../clients-chart/clients-chart'
import { ClientsChartSkeleton } from '../clients-chart/clients-chart-skeleton'

export type ChartCardProps = {
    query: UseQueryResult<ClientsResponse>
    onRetry: () => void
}

// first card on the page: its error is the one that is announced
export const ChartCard = ({ query, onRetry }: ChartCardProps) => (
    <ClientsCard
        title="Clients chart"
        query={query}
        onRetry={onRetry}
        announceError
        placeholder={<ClientsChartSkeleton />}
    >
        {({ months, company }) => (
            <ClientsChart months={months} company={company} />
        )}
    </ClientsCard>
)
