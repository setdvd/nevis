import type { Company } from '@nevis/api-contract/model'
import { formatMonth } from '@nevis/utils'
import type { ReactNode } from 'react'
import { startTransition, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react-aria-components'

import { Avatar } from '../../../ui/avatar/avatar'
import {
    Cell,
    ChildRows,
    Column,
    Row,
    RowHeaderCell,
    Table,
    TableBody,
    TableHeader,
    TableScroller,
} from '../../../ui/table/table'
import { advisorAvatarUrl } from '../advisor-avatar-url'
import { findDataIssues, mismatchKey, warnDataIssues } from '../data-issues'
import type { SumMismatch } from '../data-issues'

import { nextExpanded, toggleExpanded, toTableTree } from './table-tree'
import type { ClientsTableNode } from './table-tree'

const NAME_COLUMN = 'name'

const leading = (node: ClientsTableNode): ReactNode => {
    switch (node.kind) {
        case 'advisor':
            return (
                <Avatar
                    name={node.name}
                    seed={node.id}
                    src={advisorAvatarUrl(node.id)}
                />
            )
        case 'company':
        case 'branch':
        case 'channel':
            return undefined
    }
}

// Stored value, unchanged. A total that differs from the sum of its children
// gets a marker: a dot, a tooltip on hover, the full note while the cell has
// keyboard focus, and the same note for screen readers.
const MismatchValue = ({ mismatch }: { mismatch: SumMismatch }) => {
    const note = `Stored ${String(mismatch.stored)}, children sum to ${String(mismatch.childrenSum)}`
    return (
        <span
            className="relative inline-flex items-center gap-1.5"
            title={note}
        >
            <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[#c2410c] forced-colors:bg-[CanvasText]"
            />
            {mismatch.stored}
            <span className="sr-only">{`, ${note}`}</span>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full right-0 z-20 mt-1 hidden rounded bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface group-focus-within/cell:block"
            >
                {note}
            </span>
        </span>
    )
}

export type ClientsTableProps = {
    months: readonly string[]
    company: Company
}

export const ClientsTable = ({ months, company }: ClientsTableProps) => {
    const tree = useMemo(() => toTableTree(company), [company])
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
    // start: Company open, everything else closed
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(
        () => new Set([tree.id])
    )
    // rows inserted after the first user toggle slide in; start rows never
    const [animateNewRows, setAnimateNewRows] = useState(false)

    useEffect(() => {
        if (import.meta.env.DEV) {
            warnDataIssues(issues, months)
        }
    }, [issues, months])

    // Opening or closing re-renders every visible row (RAC rebuilds the tree):
    // as a transition, the press itself is handled at once and the browser can
    // paint, while React renders the rows in chunks it can pause (INP).

    // click, tap, Enter
    const toggle = (id: string) => {
        startTransition(() => {
            setAnimateNewRows(true)
            setExpanded((previous) => toggleExpanded(previous, id, tree))
        })
    }

    // Right / Left keys
    const onExpandedChange = (keys: Set<Key>) => {
        startTransition(() => {
            setAnimateNewRows(true)
            setExpanded((previous) =>
                nextExpanded(previous, new Set([...keys].map(String)), tree)
            )
        })
    }

    const renderRow = (node: ClientsTableNode) => (
        <Row
            id={node.id}
            textValue={node.name}
            {...(node.children !== undefined && {
                onAction: () => {
                    toggle(node.id)
                },
            })}
        >
            <RowHeaderCell label={node.name} leading={leading(node)} />
            {node.values.map((value, monthIndex) => {
                const mismatch = mismatches.get(
                    mismatchKey(node.id, monthIndex)
                )
                return (
                    <Cell key={months[monthIndex] ?? monthIndex}>
                        {mismatch === undefined ? (
                            value
                        ) : (
                            <MismatchValue mismatch={mismatch} />
                        )}
                    </Cell>
                )
            })}
            {node.children !== undefined && (
                <ChildRows items={node.children}>{renderRow}</ChildRows>
            )}
        </Row>
    )

    return (
        <TableScroller>
            <Table
                label="Clients per month"
                treeColumn={NAME_COLUMN}
                expandedKeys={expanded}
                onExpandedChange={onExpandedChange}
                animateNewRows={animateNewRows}
            >
                <TableHeader>
                    <Column id={NAME_COLUMN} isRowHeader>
                        <span className="sr-only">Name</span>
                    </Column>
                    {months.map((month) => (
                        <Column key={month} id={month}>
                            {formatMonth(month)}
                        </Column>
                    ))}
                </TableHeader>
                <TableBody items={[tree]}>{renderRow}</TableBody>
            </Table>
        </TableScroller>
    )
}
