import type { ClientsResponse } from '@nevis/api-contract/model'

import { ChartCard } from '../chart-card/chart-card'
import { TableCard } from '../table-card/table-card'

export type ClientsDashboardProps = {
    data: ClientsResponse
}

// the loaded page content: the chart card, then the table card
export const ClientsDashboard = ({
    data: { months, company },
}: ClientsDashboardProps) => (
    <>
        <ChartCard months={months} company={company} />
        <TableCard months={months} company={company} />
    </>
)
