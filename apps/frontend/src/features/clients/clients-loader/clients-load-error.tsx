import { Card } from '../../../ui/card/card'
import { LoadError } from '../../../ui/load-error/load-error'
import { loadErrorMessage } from '../describe-load-error'

export type ClientsLoadErrorProps = {
    error: Error
    onRetry: () => void
}

// The error state: both cards keep their place and say why, each with Retry.
// Only the first one is announced, so a screen reader hears it once.
export const ClientsLoadError = ({ error, onRetry }: ClientsLoadErrorProps) => {
    const message = loadErrorMessage(error)
    return (
        <>
            <Card title="Clients chart">
                <LoadError message={message} onRetry={onRetry} announce />
            </Card>
            <Card title="Clients table">
                <LoadError message={message} onRetry={onRetry} />
            </Card>
        </>
    )
}
