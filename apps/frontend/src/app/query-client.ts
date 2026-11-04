import { QueryClient } from '@tanstack/react-query'

// Request policy (PLAN.md decision 8): data loaded once per visit and kept;
// one automatic retry after 500 ms; no refetch on window focus or reconnect;
// offline -> the request is tried and fails (network error) instead of pausing.
// The 10 s timeout per attempt comes from the generated query options.
export const createQueryClient = (): QueryClient =>
    new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: Infinity,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                retry: 1,
                retryDelay: 500,
                networkMode: 'always',
            },
        },
    })
