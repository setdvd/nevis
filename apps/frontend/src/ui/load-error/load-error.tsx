import { CircleAlert } from 'lucide-react'

import { Button } from '../button/button'

export type LoadErrorProps = {
    message: string
    retryLabel: string
    onRetry: () => void
    // a page with several errors announces only one of them
    announce?: boolean
}

export const LoadError = ({
    message,
    retryLabel,
    onRetry,
    announce = false,
}: LoadErrorProps) => (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <CircleAlert
            aria-hidden="true"
            size={20}
            strokeWidth={1.5}
            className="text-muted"
        />
        <p role={announce ? 'alert' : undefined}>{message}</p>
        <Button onPress={onRetry}>{retryLabel}</Button>
    </div>
)
