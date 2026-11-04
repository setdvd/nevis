import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'

import preview from '../../../../.storybook/preview'

import { ChartCard } from './chart-card'

const meta = preview.meta({
    component: ChartCard,
    args: { months: clientsResponse.months, company: clientsResponse.company },
})

export const Delivered = meta.story({})

// a channel the delivered data does not have ("Referral")
export const OtherChannels = meta.story({
    args: { months: exampleResponse.months, company: exampleResponse.company },
})
