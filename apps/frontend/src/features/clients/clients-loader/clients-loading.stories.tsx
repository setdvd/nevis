import preview from '../../../../.storybook/preview'

import { ClientsLoading } from './clients-loading'

const meta = preview.meta({
    component: ClientsLoading,
    decorators: [
        (Story) => (
            <div className="flex flex-col gap-4">
                <Story />
            </div>
        ),
    ],
})

export const Loading = meta.story({})
