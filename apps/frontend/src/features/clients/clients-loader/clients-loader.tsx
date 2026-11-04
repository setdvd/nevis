import { useGetClients } from '@nevis/api-contract/client'
import type { getClientsResponseSuccess } from '@nevis/api-contract/client'
import type { ClientsResponse } from '@nevis/api-contract/model'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { ClientsLoadError } from './clients-load-error'
import { ClientsLoading } from './clients-loading'
import { useDelayedFlag } from './use-delayed-flag'

// stable reference: the query keeps the same select between renders
const selectData = (response: getClientsResponseSuccess) => response.data

// "Loading..." only for a load slower than this: a fast load announces nothing
const LOADING_NOTICE_DELAY_MS = 1000

export type ClientsLoaderProps = {
    // Retry is starting: e.g. move focus away before the Retry button goes
    onRetry?: () => void
    // the loaded data; rendered only on success
    children: (data: ClientsResponse) => ReactNode
}

// Loads the clients and shows the load states, nothing else: placeholders
// while the first load runs, the error with Retry when it fails, the children
// with the data when loaded. Also owns what is announced about loading: the
// busy mark and the status line.
export const ClientsLoader = ({ onRetry, children }: ClientsLoaderProps) => {
    const query = useGetClients({ query: { select: selectData } })
    // set only by a successful Retry: the first load never says "loaded"
    const [retryLoaded, setRetryLoaded] = useState(false)
    const showLoadingNotice = useDelayedFlag(
        query.status === 'pending',
        LOADING_NOTICE_DELAY_MS
    )

    const retry = () => {
        setRetryLoaded(false)
        onRetry?.()
        void query.refetch().then((result) => {
            setRetryLoaded(result.status === 'success')
        })
    }

    const content = (): ReactNode => {
        switch (query.status) {
            case 'pending':
                return <ClientsLoading />
            case 'error':
                return <ClientsLoadError error={query.error} onRetry={retry} />
            case 'success':
                return children(query.data)
        }
    }

    const statusText = showLoadingNotice
        ? 'Loading clients...'
        : retryLoaded
          ? 'Clients loaded'
          : ''

    return (
        <>
            <div
                aria-busy={query.status === 'pending'}
                className="flex flex-col gap-4"
            >
                {content()}
            </div>
            {/* after the cards and outside aria-busy, so it is announced */}
            <p role="status" className="sr-only">
                {statusText}
            </p>
        </>
    )
}
