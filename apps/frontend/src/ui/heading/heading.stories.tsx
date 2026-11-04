import preview from '../../../.storybook/preview'

import { Heading } from './heading'
import type { HeadingProps } from './heading'

// typed: a plain object literal widens level 1 to number and the meta args get lost
const defaultArgs: HeadingProps = { level: 1, children: 'Clients' }

const meta = preview.meta({
    component: Heading,
    args: defaultArgs,
})

export const PageTitle = meta.story({})

export const Section = meta.story({ args: { level: 2, children: 'Section' } })

export const Subsection = meta.story({
    args: { level: 3, children: 'Subsection' },
})
