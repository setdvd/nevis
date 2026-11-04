import { useGetClients } from '@nevis/api-contract/client'
import type { getClientsResponseSuccess } from '@nevis/api-contract/client'
import { useRef, useState } from 'react'

import { ChartCard } from '../features/clients/chart-card/chart-card'
import { TableCard } from '../features/clients/table-card/table-card'

import { useDelayedFlag } from './use-delayed-flag'

// stable reference: the query keeps the same select between renders
const selectData = (response: getClientsResponseSuccess) => response.data

// "Loading..." only for a load slower than this: a fast load announces nothing
const LOADING_NOTICE_DELAY_MS = 1000

export const DashboardPage = () => {
    const query = useGetClients({ query: { select: selectData } })
    const headingRef = useRef<HTMLHeadingElement>(null)
    // set only by a successful Retry: the first load never says "loaded"
    const [retryLoaded, setRetryLoaded] = useState(false)
    const showLoadingNotice = useDelayedFlag(
        query.status === 'pending',
        LOADING_NOTICE_DELAY_MS
    )

    // Focus goes to the heading first: the Retry button disappears while
    // loading, and focus would otherwise drop to the page start. The heading is
    // focusable only until focus leaves it; set on the element directly, so the
    // heading needs no React handler (it is not an interactive element).
    const retry = () => {
        setRetryLoaded(false)
        const heading = headingRef.current
        if (heading !== null) {
            heading.tabIndex = -1
            heading.addEventListener(
                'blur',
                () => {
                    heading.removeAttribute('tabindex')
                },
                { once: true }
            )
            heading.focus()
        }
        void query.refetch().then((result) => {
            setRetryLoaded(result.status === 'success')
        })
    }

    const statusText = showLoadingNotice
        ? 'Loading clients...'
        : retryLoaded
          ? 'Clients loaded'
          : ''

    return (
        <main className="mx-auto box-content flex max-w-content flex-col gap-4 px-4 py-6">
            <h1
                ref={headingRef}
                className="text-display font-normal outline-hidden"
            >
                Clients
            </h1>
            <div
                aria-busy={query.status === 'pending'}
                className="flex flex-col gap-4"
            >
                <ChartCard query={query} onRetry={retry} />
                <TableCard query={query} onRetry={retry} />
            </div>
            {/* after the cards and outside aria-busy, so it is announced */}
            <p role="status" className="sr-only">
                {statusText}
            </p>
        </main>
    )
}
