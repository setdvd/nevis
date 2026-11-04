import type { Company } from '@nevis/api-contract/model'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { useI18n } from '../../../i18n/i18n-context'
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

import { MismatchValue } from './mismatch-value'
import { toTableTree } from './table-tree'
import type { ClientsTableNode } from './table-tree'
import { useDataIssues } from './use-data-issues'
import { useExpandedRows } from './use-expanded-rows'

const NAME_COLUMN = 'name'

// advisors show their photo; other levels nothing
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

export type ClientsTableProps = {
    months: readonly string[]
    company: Company
}

// The company tree as a tree table: one row per node, one column per month,
// stored values only. Open / closed state and data issues come from hooks;
// this component renders.
export const ClientsTable = ({ months, company }: ClientsTableProps) => {
    const { messages, formatMonth, formatNumber } = useI18n()
    const tree = useMemo(() => toTableTree(company), [company])
    const { expanded, animateNewRows, toggle, onExpandedChange } =
        useExpandedRows(tree)
    const mismatchAt = useDataIssues(tree, months)

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
                const mismatch = mismatchAt(node.id, monthIndex)
                return (
                    <Cell key={months[monthIndex] ?? monthIndex}>
                        {mismatch === undefined ? (
                            formatNumber(value)
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
                label={messages.table.label}
                treeColumn={NAME_COLUMN}
                expandedKeys={expanded}
                onExpandedChange={onExpandedChange}
                animateNewRows={animateNewRows}
            >
                <TableHeader>
                    <Column id={NAME_COLUMN} isRowHeader>
                        <span className="sr-only">
                            {messages.table.nameColumn}
                        </span>
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
