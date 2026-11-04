import { useI18n } from '../../../i18n/i18n-context'
import { Card } from '../../../ui/card/card'
import { LoadError } from '../../../ui/load-error/load-error'
import { loadErrorReason } from '../describe-load-error'

export type ClientsLoadErrorProps = {
    error: Error
    onRetry: () => void
}

// The error state: both cards keep their place and say why, each with Retry.
// Only the first one is announced, so a screen reader hears it once.
export const ClientsLoadError = ({ error, onRetry }: ClientsLoadErrorProps) => {
    const { messages } = useI18n()
    const message = messages.load.error(loadErrorReason(error))
    return (
        <>
            <Card title={messages.chart.cardTitle}>
                <LoadError
                    message={message}
                    retryLabel={messages.load.retry}
                    onRetry={onRetry}
                    announce
                />
            </Card>
            <Card title={messages.table.cardTitle}>
                <LoadError
                    message={message}
                    retryLabel={messages.load.retry}
                    onRetry={onRetry}
                />
            </Card>
        </>
    )
}
