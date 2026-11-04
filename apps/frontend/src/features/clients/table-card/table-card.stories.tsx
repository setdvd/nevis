import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'

import preview from '../../../../.storybook/preview'
import { en } from '../../../i18n/en'
import { I18nProvider } from '../../../i18n/i18n-provider'

import { TableCard } from './table-card'

const meta = preview.meta({
    component: TableCard,
    args: { months: clientsResponse.months, company: clientsResponse.company },
})

// with the 7 totals that do not add up marked
export const Delivered = meta.story({})

// every total adds up: no markers
export const Consistent = meta.story({
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
