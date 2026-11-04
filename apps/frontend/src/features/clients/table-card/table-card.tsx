import type { Company } from '@nevis/api-contract/model'

import { useI18n } from '../../../i18n/i18n-context'
import { Card } from '../../../ui/card/card'
import { ClientsTable } from '../clients-table/clients-table'

export type TableCardProps = {
    months: readonly string[]
    company: Company
}

export const TableCard = ({ months, company }: TableCardProps) => {
    const { messages } = useI18n()
    return (
        <Card title={messages.table.cardTitle}>
            <ClientsTable months={months} company={company} />
        </Card>
    )
}
