import preview from '../../../.storybook/preview'

import { Card } from './card'

const meta = preview.meta({
    component: Card,
    args: {
        title: 'Clients chart',
        children: <p className="p-6">Card content</p>,
    },
})

export const Default = meta.story({})
