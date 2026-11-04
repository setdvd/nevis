import { formatMonth } from '@nevis/utils'
import { createContext, use } from 'react'

import { en } from './en'
import type { Messages } from './messages'

export type I18n = {
    // BCP 47 tag, e.g. 'en-US'
    locale: string
    messages: Messages
    // 1234 -> '1,234' (en-US)
    formatNumber: (value: number) => string
    // '2024-02' -> 'Feb 2024' (en-US)
    formatMonth: (yearMonth: string) => string
}

export const createI18n = (locale: string, messages: Messages): I18n => {
    // one formatter per instance: creating Intl formatters is the costly part
    const numbers = new Intl.NumberFormat(locale)
    return {
        locale,
        messages,
        formatNumber: (value) => numbers.format(value),
        formatMonth: (yearMonth) => formatMonth(yearMonth, locale),
    }
}

// Default: English. Also what anything outside the provider gets (the crash
// fallback sits outside it, and stories and tests need no provider).
export const I18nContext = createContext<I18n>(createI18n('en-US', en))

export const useI18n = (): I18n => use(I18nContext)
