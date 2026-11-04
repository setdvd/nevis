import { InvalidDataError } from '@nevis/api-contract/http'
import type { ClientsResponse } from '@nevis/api-contract/model'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'

export type StoryQueryState =
    | 'loading'
    | 'loaded'
    | 'server-error'
    | 'timeout'
    | 'network-error'
    | 'invalid-data'
    | 'unknown-error'

type ErrorState = Exclude<StoryQueryState, 'loading' | 'loaded'>

// the errors the real client produces, one per state
const errorFor = (state: ErrorState): Error => {
    switch (state) {
        case 'server-error':
            return Object.assign(new Error(), { status: 500 })
        case 'timeout':
            return new DOMException('signal timed out', 'TimeoutError')
        case 'network-error':
            return new TypeError('Failed to fetch')
        case 'invalid-data':
            return new InvalidDataError('Response is not JSON')
        case 'unknown-error':
            return new Error('boom')
    }
}

// Stories only: a real TanStack Query result in the wanted state, no network.
export const useStoryQuery = (
    state: StoryQueryState,
    data: ClientsResponse
): UseQueryResult<ClientsResponse> =>
    useQuery({
        queryKey: ['story-clients', state],
        queryFn: () => {
            switch (state) {
                case 'loading':
                    return new Promise<ClientsResponse>(() => undefined)
                case 'loaded':
                    return Promise.resolve(data)
                case 'server-error':
                case 'timeout':
                case 'network-error':
                case 'invalid-data':
                case 'unknown-error':
                    return Promise.reject(errorFor(state))
            }
        },
        retry: false,
        // never stale: no refetch on mount, which would replace the data state
        staleTime: Infinity,
        ...(state === 'loaded' && { initialData: data }),
    })
