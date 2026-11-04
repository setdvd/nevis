import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'

import preview from '../../../../.storybook/preview'
import { en } from '../../../i18n/en'
import { I18nProvider } from '../../../i18n/i18n-provider'

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

// locale formatting only (German months and numbers); the text stays English:
// there is no German catalog yet
export const GermanFormatting = meta.story({
    decorators: [
        (Story) => (
            <I18nProvider locale="de-DE" messages={en}>
                <Story />
            </I18nProvider>
        ),
    ],
})
