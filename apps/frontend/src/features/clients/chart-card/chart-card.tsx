import type { Company } from '@nevis/api-contract/model'

import { Card } from '../../../ui/card/card'
import { ClientsChart } from '../clients-chart/clients-chart'

export type ChartCardProps = {
    months: readonly string[]
    company: Company
}

export const ChartCard = ({ months, company }: ChartCardProps) => (
    <Card title="Clients chart">
        <ClientsChart months={months} company={company} />
    </Card>
)
