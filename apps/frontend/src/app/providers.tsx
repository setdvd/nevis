import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { en } from '../i18n/en'
import { I18nProvider } from '../i18n/i18n-provider'

import { createQueryClient } from './query-client'

export type ProvidersProps = {
    children: ReactNode
}

// The only language for now. Another one = another Messages catalog and its
// locale here (e.g. picked from navigator.languages or the user's settings).
const LOCALE = 'en-US'

// one client per app instance (not per module), so tests and stories stay apart
export const Providers = ({ children }: ProvidersProps) => {
    const [queryClient] = useState(createQueryClient)
    return (
        <I18nProvider locale={LOCALE} messages={en}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </I18nProvider>
    )
}
