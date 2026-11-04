import { useRef } from 'react'

import { ClientsDashboard } from '../features/clients/clients-dashboard/clients-dashboard'
import { ClientsLoader } from '../features/clients/clients-loader/clients-loader'
import { useI18n } from '../i18n/i18n-context'
import { Heading } from '../ui/heading/heading'
import { Page } from '../ui/page/page'

// Focus goes to the heading when Retry starts: the Retry button disappears
// while loading, and focus would otherwise drop to the page start. The heading
// is focusable only until focus leaves it; set on the element directly, so it
// needs no React handler (it is not an interactive element).
const focusUntilBlur = (element: HTMLElement | null) => {
    if (element === null) {
        return
    }
    element.tabIndex = -1
    element.addEventListener(
        'blur',
        () => {
            element.removeAttribute('tabindex')
        },
        { once: true }
    )
    element.focus()
}

// page layout: heading, then the clients content once loaded
export const DashboardPage = () => {
    const { messages } = useI18n()
    const headingRef = useRef<HTMLHeadingElement>(null)
    return (
        <Page>
            <Heading level={1} ref={headingRef}>
                {messages.page.title}
            </Heading>
            <ClientsLoader
                onRetry={() => {
                    focusUntilBlur(headingRef.current)
                }}
            >
                {(data) => <ClientsDashboard data={data} />}
            </ClientsLoader>
        </Page>
    )
}
