import type { LoadErrorReason, Messages } from './messages'

const reasonText = (reason: LoadErrorReason): string => {
    switch (reason.kind) {
        case 'timeout':
            return 'The request timed out.'
        case 'network':
            return 'Network error.'
        case 'server':
            return `Server error (${String(reason.status)}).`
        case 'invalidData':
            return 'The data was not valid.'
    }
}

// English. No plural forms needed yet: no text counts things. When one does,
// use Intl.PluralRules here (or ICU plurals, see messages.ts).
export const en: Messages = {
    page: {
        title: 'Clients',
    },
    crash: {
        message: 'Something went wrong.',
        reload: 'Reload',
    },
    load: {
        loading: 'Loading clients...',
        loaded: 'Clients loaded',
        retry: 'Retry',
        error: (reason) =>
            reason === undefined
                ? 'Could not load clients.'
                : `Could not load clients. ${reasonText(reason)}`,
    },
    chart: {
        cardTitle: 'Clients chart',
        title: 'Clients per month',
        label: (from, to) => `Clients per month, ${from} to ${to}`,
        description: 'Use arrow keys to read each month. Data table follows.',
        total: 'Total',
        month: 'Month',
        existingClients: 'Existing clients',
    },
    table: {
        cardTitle: 'Clients table',
        label: 'Clients per month',
        nameColumn: 'Name',
        mismatch: (stored, childrenSum) =>
            `Stored ${stored}, children sum to ${childrenSum}`,
    },
}
