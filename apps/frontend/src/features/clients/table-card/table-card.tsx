import type { Company } from '@nevis/api-contract/model'

import { Card } from '../../../ui/card/card'
import { ClientsTable } from '../clients-table/clients-table'

export type TableCardProps = {
    months: readonly string[]
    company: Company
}

export const TableCard = ({ months, company }: TableCardProps) => (
    <Card title="Clients table">
        <ClientsTable months={months} company={company} />
    </Card>
)
