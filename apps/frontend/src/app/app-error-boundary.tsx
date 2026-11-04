import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

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
                <Heading level={1}>Something went wrong.</Heading>
                <Button
                    onPress={() => {
                        window.location.reload()
                    }}
                >
                    Reload
                </Button>
            </Page>
        )
    }
}
