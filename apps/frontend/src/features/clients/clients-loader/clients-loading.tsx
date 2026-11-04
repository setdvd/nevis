import { Card } from '../../../ui/card/card'
import { ClientsChartSkeleton } from '../clients-chart/clients-chart-skeleton'
import { ClientsTableSkeleton } from '../clients-table/clients-table-skeleton'

// The loading state: both cards with placeholders of the content's own
// height, so nothing moves when the data arrives.
export const ClientsLoading = () => (
    <>
        <Card title="Clients chart">
            <ClientsChartSkeleton />
        </Card>
        <Card title="Clients table">
            <ClientsTableSkeleton />
        </Card>
    </>
)
