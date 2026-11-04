import { useState } from 'react'
import type { Key } from 'react-aria-components'

import preview from '../../../.storybook/preview'

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
} from './table'

// domain-free sample tree: ui/ knows nothing about clients
type Item = {
    id: string
    name: string
    values: number[]
    children?: Item[]
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

const ITEMS: Item[] = [
    {
        id: 'fruit',
        name: 'Fruit',
        values: [30, 32, 35, 40],
        children: [
            {
                id: 'apples',
                name: 'Apples',
                values: [20, 21, 22, 25],
                children: [
                    { id: 'red', name: 'Red apples', values: [12, 13, 13, 15] },
                    {
                        id: 'green',
                        name: 'Green apples',
                        values: [8, 8, 9, 10],
                    },
                ],
            },
            { id: 'pears', name: 'Pears', values: [10, 11, 13, 15] },
        ],
    },
    {
        id: 'vegetables-with-a-very-long-name',
        name: 'Vegetables with a very long name that does not fit',
        values: [5, 6, 7, 8],
    },
]

type TreeTableProps = {
    defaultExpanded: string[]
}

// the composition a feature does: rows, child rows, open state
const TreeTable = ({ defaultExpanded }: TreeTableProps) => {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(
        () => new Set(defaultExpanded)
    )
    const [animate, setAnimate] = useState(false)
    const toggle = (id: string) => {
        setAnimate(true)
        setExpanded((previous) => {
            const next = new Set(previous)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }
    const renderRow = (item: Item) => (
        <Row
            id={item.id}
            textValue={item.name}
            {...(item.children !== undefined && {
                onAction: () => {
                    toggle(item.id)
                },
            })}
        >
            <RowHeaderCell label={item.name} />
            {item.values.map((value, index) => (
                <Cell key={index}>{value}</Cell>
            ))}
            {item.children !== undefined && (
                <ChildRows items={item.children}>{renderRow}</ChildRows>
            )}
        </Row>
    )
    return (
        <TableScroller>
            <Table
                label="Produce per quarter"
                treeColumn="name"
                expandedKeys={expanded}
                onExpandedChange={(keys: Set<Key>) => {
                    setAnimate(true)
                    setExpanded(new Set([...keys].map(String)))
                }}
                animateNewRows={animate}
            >
                <TableHeader>
                    <Column id="name" isRowHeader>
                        <span className="sr-only">Name</span>
                    </Column>
                    {QUARTERS.map((quarter) => (
                        <Column key={quarter} id={quarter}>
                            {quarter}
                        </Column>
                    ))}
                </TableHeader>
                <TableBody items={ITEMS}>{renderRow}</TableBody>
            </Table>
        </TableScroller>
    )
}

const meta = preview.meta({
    component: TreeTable,
    args: { defaultExpanded: ['fruit'] },
    decorators: [
        (Story) => (
            <div className="rounded-card bg-surface">
                <Story />
            </div>
        ),
    ],
})

export const Tree = meta.story({})

export const AllOpen = meta.story({
    args: { defaultExpanded: ['fruit', 'apples'] },
})

// 375px window: the table scrolls inside, the name column stays
export const Narrow = meta.story({
    decorators: [
        (Story) => (
            <div className="w-[343px]">
                <Story />
            </div>
        ),
    ],
})
