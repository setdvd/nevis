// Data integrity issues: stored data that contradicts itself or the contract,
// e.g. a total that differs from the sum of its children (PLAN.md section 5).
// Every issue a check finds is reported here, in every build, so the data
// owner hears of it. Reporting never changes the data: the UI still shows the
// stored values.

export type DataIssueReport = {
    // stable per issue (kind, node, month): reported once per page load, and
    // the Sentry fingerprint, so one issue there per broken value
    key: string
    // for developers, not user-facing copy
    message: string
    // structured facts for the report: node id, month, stored and expected
    details: Readonly<Record<string, string | number>>
}

// already reported in this page load: StrictMode runs effects twice in dev,
// and a re-render must not report the same data again
const reported = new Set<string>()

export const reportDataIssue = ({
    key,
    message,
    details,
}: DataIssueReport): void => {
    if (reported.has(key)) {
        return
    }
    reported.add(key)
    // TODO(Sentry): report to Sentry in every build, once it is set up:
    //   Sentry.captureMessage(message, {
    //       level: 'warning',
    //       fingerprint: ['data-integrity', key],
    //       tags: { kind: 'data-integrity' },
    //       extra: details,
    //   })
    // Until then the dev console is the only output; production stays silent.
    if (import.meta.env.DEV) {
        console.warn(`[data] ${message}`, details)
    }
}
