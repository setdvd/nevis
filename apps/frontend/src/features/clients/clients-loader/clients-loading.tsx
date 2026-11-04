import { useI18n } from '../../../i18n/i18n-context'
import { Card } from '../../../ui/card/card'
import { ClientsChartSkeleton } from '../clients-chart/clients-chart-skeleton'
import { ClientsTableSkeleton } from '../clients-table/clients-table-skeleton'

// The loading state: both cards with placeholders of the content's own
// height, so nothing moves when the data arrives.
export const ClientsLoading = () => {
    const { messages } = useI18n()
    return (
        <>
            <Card title={messages.chart.cardTitle}>
                <ClientsChartSkeleton />
            </Card>
            <Card title={messages.table.cardTitle}>
                <ClientsTableSkeleton />
            </Card>
        </>
    )
}
