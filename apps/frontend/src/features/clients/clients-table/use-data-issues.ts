import { useEffect, useMemo } from 'react'

import { findDataIssues, mismatchKey, warnDataIssues } from '../data-issues'
import type { SumMismatch } from '../data-issues'

import type { ClientsTableNode } from './table-tree'

// The data issues of the tree (see data-issues.ts): a lookup for the cells
// that do not add up, and one console warning per issue in dev builds.
export const useDataIssues = (
    tree: ClientsTableNode,
    months: readonly string[]
): ((nodeId: string, monthIndex: number) => SumMismatch | undefined) => {
    const issues = useMemo(() => findDataIssues(tree), [tree])
    const mismatches = useMemo(
        () =>
            new Map(
                issues.sumMismatches.map((issue) => [
                    mismatchKey(issue.nodeId, issue.monthIndex),
                    issue,
                ])
            ),
        [issues]
    )

    useEffect(() => {
        if (import.meta.env.DEV) {
            warnDataIssues(issues, months)
        }
    }, [issues, months])

    return (nodeId, monthIndex) =>
        mismatches.get(mismatchKey(nodeId, monthIndex))
}
