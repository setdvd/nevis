import preview from '../../../.storybook/preview'

import { Skeleton } from './skeleton'

const meta = preview.meta({
    component: Skeleton,
    args: { size: 'h-4 w-32' },
})

export const Line = meta.story({})

export const Circle = meta.story({ args: { size: 'size-5', shape: 'circle' } })

export const Block = meta.story({ args: { size: 'h-40 w-80' } })
