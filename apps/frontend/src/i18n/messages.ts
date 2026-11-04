// Every piece of user-facing text, by place. Text with values in it is a
// function, so a translation can put the values where its grammar needs them.
// Values arrive already formatted for the locale (numbers, months).
// Not here, on purpose: channel names (they come from the data) and the
// data issue reports (reportDataIssue: for developers and Sentry, in English).
//
// Why no i18n library (react-intl / FormatJS, Lingui, i18next):
// - the stack has none, and the app has ~25 strings, one language, no plurals;
// - a typed Messages catalog makes every key and every value a compile-time
//   check (a missing translation is a type error), with 0 kB added;
// - Intl (built in) already does the locale formatting: NumberFormat,
//   DateTimeFormat; PluralRules and ListFormat are there when needed.
// What it costs, compared with a library:
// - no ICU MessageFormat: plurals / select would be hand-written per catalog;
// - catalogs are TypeScript functions, so translators cannot edit them in a
//   translation tool, and there is no message extraction;
// - no lazy loading of catalogs per locale, no fallback chain.
// Switch to react-intl (or Lingui) when real translations, plurals or a
// translation tool arrive. The switch stays small: every text is behind this
// type and useI18n(), so the catalogs become ICU messages, useI18n() wraps
// useIntl(), and the components do not change.

// why loading failed, as far as the app can tell (see describe-load-error.ts)
export type LoadErrorReason =
    | { kind: 'timeout' }
    | { kind: 'network' }
    | { kind: 'server'; status: number }
    | { kind: 'invalidData' }

export type Messages = {
    page: {
        // the page heading and the document title
        title: string
    }
    crash: {
        message: string
        reload: string
    }
    load: {
        // status line while a load takes longer than a second
        loading: string
        // status line after a successful Retry
        loaded: string
        retry: string
        // undefined reason: the cause is not known
        error: (reason: LoadErrorReason | undefined) => string
    }
    chart: {
        // card name for screen readers
        cardTitle: string
        // data table caption
        title: string
        // accessible name of the chart: title and period
        label: (from: string, to: string) => string
        // keyboard hint, read with the chart
        description: string
        total: string
        // header of the month column in the data table
        month: string
        // the derived bottom series (all clients without a new-client channel)
        existingClients: string
    }
    table: {
        cardTitle: string
        label: string
        // hidden header of the name column
        nameColumn: string
        // note on a stored total that differs from the sum of its children
        mismatch: (stored: string, childrenSum: string) => string
    }
}
