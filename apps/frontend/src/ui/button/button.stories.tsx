import { fn } from 'storybook/test'

import preview from '../../../.storybook/preview'

import { Button } from './button'

const meta = preview.meta({
    component: Button,
    args: { children: 'Retry', onPress: fn() },
})

export const Default = meta.story({})

export const Disabled = meta.story({ args: { isDisabled: true } })
