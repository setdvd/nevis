import { clientsResponse } from '@nevis/api-contract/fixtures'
import { fn } from 'storybook/test'

import preview from '../../../../.storybook/preview'
import { StoryQueryClient } from '../story-query/story-query-client'
import { useStoryQuery } from '../story-query/use-story-query'
import type { StoryQueryState } from '../story-query/use-story-query'

import { TableCard } from './table-card'

type TableCardStoryProps = {
    state: StoryQueryState
    onRetry: () => void
}

const TableCardWithQuery = ({ state, onRetry }: TableCardStoryProps) => (
    <TableCard
        query={useStoryQuery(state, clientsResponse)}
        onRetry={onRetry}
    />
)

// own client per story: states never leak between stories
const TableCardStory = (props: TableCardStoryProps) => (
    <StoryQueryClient>
        <TableCardWithQuery {...props} />
    </StoryQueryClient>
)

// typed: a plain object literal widens 'loaded' to string and the meta args get lost
const defaultArgs: TableCardStoryProps = { state: 'loaded', onRetry: fn() }

const meta = preview.meta({
    component: TableCardStory,
    args: defaultArgs,
})

export const Loading = meta.story({ args: { state: 'loading' } })

export const Loaded = meta.story({})

// the table card does not announce its error: the chart card does
export const ServerError = meta.story({ args: { state: 'server-error' } })
