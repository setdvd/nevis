import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'

import { createI18n, I18nContext } from './i18n-context'
import type { Messages } from './messages'

export type I18nProviderProps = {
    locale: string
    messages: Messages
    children: ReactNode
}

// Gives the page its language: messages and locale formatting below, and the
// document's lang and title, so screen readers pronounce the right language.
// With an i18n library this is where its provider goes (e.g. react-intl's
// IntlProvider), and useI18n() reads from it; see messages.ts for why there
// is none yet.
// TODO: also wrap react-aria-components' own I18nProvider with the same
// locale. RAC takes the browser language for its built-in screen-reader text
// and for right-to-left layout (Left / Right swap for opening rows); without
// it, a page in one language can announce RAC parts in another.
export const I18nProvider = ({
    locale,
    messages,
    children,
}: I18nProviderProps) => {
    const i18n = useMemo(() => createI18n(locale, messages), [locale, messages])

    useEffect(() => {
        document.documentElement.lang = locale
        document.title = messages.page.title
    }, [locale, messages])

    return <I18nContext value={i18n}>{children}</I18nContext>
}
