import { clientsResponse } from '@nevis/api-contract/fixtures'
import { fn } from 'storybook/test'

import preview from '../../../../.storybook/preview'
import { StoryQueryClient } from '../story-query/story-query-client'
import { useStoryQuery } from '../story-query/use-story-query'
import type { StoryQueryState } from '../story-query/use-story-query'

import { ChartCard } from './chart-card'

type ChartCardStoryProps = {
    state: StoryQueryState
    onRetry: () => void
}

const ChartCardWithQuery = ({ state, onRetry }: ChartCardStoryProps) => (
    <ChartCard
        query={useStoryQuery(state, clientsResponse)}
        onRetry={onRetry}
    />
)

// own client per story: states never leak between stories
const ChartCardStory = (props: ChartCardStoryProps) => (
    <StoryQueryClient>
        <ChartCardWithQuery {...props} />
    </StoryQueryClient>
)

// typed: a plain object literal widens 'loaded' to string and the meta args get lost
const defaultArgs: ChartCardStoryProps = { state: 'loaded', onRetry: fn() }

const meta = preview.meta({
    component: ChartCardStory,
    args: defaultArgs,
})

export const Loading = meta.story({ args: { state: 'loading' } })

export const Loaded = meta.story({})

export const ServerError = meta.story({ args: { state: 'server-error' } })

export const Timeout = meta.story({ args: { state: 'timeout' } })

export const NetworkError = meta.story({ args: { state: 'network-error' } })

export const InvalidData = meta.story({ args: { state: 'invalid-data' } })

export const UnknownError = meta.story({ args: { state: 'unknown-error' } })
