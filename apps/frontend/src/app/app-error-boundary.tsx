import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { I18nContext } from '../i18n/i18n-context'
import type { I18n } from '../i18n/i18n-context'
import { Button } from '../ui/button/button'
import { Heading } from '../ui/heading/heading'
import { Page } from '../ui/page/page'

type AppErrorBoundaryProps = {
    children: ReactNode
}

type AppErrorBoundaryState = {
    failed: boolean
}

// Last line of defence for render crashes: a short message and a Reload
// instead of a blank page. React needs a class for this.
export class AppErrorBoundary extends Component<
    AppErrorBoundaryProps,
    AppErrorBoundaryState
> {
    // outside the providers: gets the context default (English)
    static override contextType = I18nContext
    declare context: I18n

    override state: AppErrorBoundaryState = { failed: false }

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { failed: true }
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('Render crash', error, info.componentStack)
    }

    override render() {
        if (!this.state.failed) {
            return this.props.children
        }
        return (
            <Page align="start">
                <Heading level={1}>
                    {this.context.messages.crash.message}
                </Heading>
                <Button
                    onPress={() => {
                        window.location.reload()
                    }}
                >
                    {this.context.messages.crash.reload}
                </Button>
            </Page>
        )
    }
}
