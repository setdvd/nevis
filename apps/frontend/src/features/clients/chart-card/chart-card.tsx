import type { Company } from '@nevis/api-contract/model'

import { useI18n } from '../../../i18n/i18n-context'
import { Card } from '../../../ui/card/card'
import { ClientsChart } from '../clients-chart/clients-chart'

export type ChartCardProps = {
    months: readonly string[]
    company: Company
}

export const ChartCard = ({ months, company }: ChartCardProps) => {
    const { messages } = useI18n()
    return (
        <Card title={messages.chart.cardTitle}>
            <ClientsChart months={months} company={company} />
        </Card>
    )
}
