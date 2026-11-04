import type { ClientsResponse } from '@nevis/api-contract/model'
import type { UseQueryResult } from '@tanstack/react-query'

import { ClientsCard } from '../clients-card/clients-card'
import { ClientsTable } from '../clients-table/clients-table'
import { ClientsTableSkeleton } from '../clients-table/clients-table-skeleton'

export type TableCardProps = {
    query: UseQueryResult<ClientsResponse>
    onRetry: () => void
}

export const TableCard = ({ query, onRetry }: TableCardProps) => (
    <ClientsCard
        title="Clients table"
        query={query}
        onRetry={onRetry}
        placeholder={<ClientsTableSkeleton />}
    >
        {({ months, company }) => (
            <ClientsTable months={months} company={company} />
        )}
    </ClientsCard>
)
