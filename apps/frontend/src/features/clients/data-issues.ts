import { formatMonth } from '@nevis/utils'

import type { ClientsTableNode } from './clients-table/table-tree'

// Data checks run on the FE for now, only to ship faster (PLAN.md decision 11).
// They belong with the data owner: TODO(BE team) - fix the discrepancies at the
// source and move these checks to the BE. The UI never corrects the data: it
// shows stored values and marks the cells that do not add up.

export type SumMismatch = {
    nodeId: string
    name: string
    monthIndex: number
    stored: number
    childrenSum: number
}

// numbers without a breakdown: an advisor without channels, a branch without advisors
export type MissingBreakdown = {
    nodeId: string
    name: string
    kind: 'advisor' | 'branch'
}

export type DataIssues = {
    sumMismatches: SumMismatch[]
    missingBreakdowns: MissingBreakdown[]
}

const walk = (node: ClientsTableNode): ClientsTableNode[] => [
    node,
    ...(node.children ?? []).flatMap(walk),
]

const sumMismatchesOf = ({
    id,
    name,
    values,
    children,
}: ClientsTableNode): SumMismatch[] => {
    if (children === undefined) {
        return []
    }
    return values.flatMap((stored, monthIndex) => {
        const childrenSum = children.reduce(
            (sum, child) => sum + (child.values[monthIndex] ?? 0),
            0
        )
        return childrenSum === stored
            ? []
            : [{ nodeId: id, name, monthIndex, stored, childrenSum }]
    })
}

const missingBreakdownOf = ({
    id,
    name,
    kind,
    children,
}: ClientsTableNode): MissingBreakdown[] => {
    if (children !== undefined) {
        return []
    }
    switch (kind) {
        case 'advisor':
        case 'branch':
            return [{ nodeId: id, name, kind }]
        case 'company':
        case 'channel':
            return []
    }
}

export const findDataIssues = (tree: ClientsTableNode): DataIssues => {
    const nodes = walk(tree)
    return {
        sumMismatches: nodes.flatMap(sumMismatchesOf),
        missingBreakdowns: nodes.flatMap(missingBreakdownOf),
    }
}

export const mismatchKey = (nodeId: string, monthIndex: number): string =>
    `${nodeId}:${String(monthIndex)}`

// already warned in this page load: StrictMode runs effects twice in dev
const warned = new Set<string>()

// one console warning per issue, once per page load (dev only, see the caller)
export const warnDataIssues = (
    issues: DataIssues,
    months: readonly string[]
): void => {
    for (const issue of issues.sumMismatches) {
        const key = `sum:${mismatchKey(issue.nodeId, issue.monthIndex)}`
        if (!warned.has(key)) {
            warned.add(key)
            const month = months[issue.monthIndex]
            console.warn(
                `[data] ${issue.name}, ${month === undefined ? `month ${String(issue.monthIndex + 1)}` : formatMonth(month)}: stored ${String(issue.stored)}, children sum to ${String(issue.childrenSum)}`
            )
        }
    }
    for (const issue of issues.missingBreakdowns) {
        const key = `missing:${issue.nodeId}`
        if (!warned.has(key)) {
            warned.add(key)
            console.warn(
                `[data] ${issue.name} (${issue.kind}) has numbers but no ${issue.kind === 'advisor' ? 'channel' : 'advisor'} breakdown`
            )
        }
    }
}
