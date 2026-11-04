import type { ClientsResponse } from '@nevis/api-contract/model'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { Card } from '../../../ui/card/card'
import { LoadError } from '../../../ui/load-error/load-error'
import { loadErrorMessage } from '../describe-load-error'

export type ClientsCardProps = {
    // not shown; names the card region for screen readers
    title: string
    query: UseQueryResult<ClientsResponse>
    onRetry: () => void
    // the page announces one error only: the first card sets this
    announceError?: boolean
    // same layout and height as the content, so loading moves nothing
    placeholder: ReactNode
    children: (data: ClientsResponse) => ReactNode
}

// One place for the load states: every card shows a placeholder while the
// first load runs, the error with Retry when it fails, the content when loaded.
export const ClientsCard = ({
    title,
    query,
    onRetry,
    announceError = false,
    placeholder,
    children,
}: ClientsCardProps) => {
    const content = (): ReactNode => {
        switch (query.status) {
            case 'pending':
                return placeholder
            case 'error':
                return (
                    <LoadError
                        message={loadErrorMessage(query.error)}
                        onRetry={onRetry}
                        announce={announceError}
                    />
                )
            case 'success':
                return children(query.data)
        }
    }
    return <Card title={title}>{content()}</Card>
}
