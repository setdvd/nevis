import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'
import type { Company } from '@nevis/api-contract/model'
import { describe, expect, it } from 'vitest'

import {
    collapseKeys,
    nextExpanded,
    toggleExpanded,
    toTableTree,
} from './table-tree'
import type { ClientsTableNode } from './table-tree'

const tree = toTableTree(clientsResponse.company)

const byName = (node: ClientsTableNode, name: string): ClientsTableNode => {
    const stack = [node]
    for (
        let current = stack.pop();
        current !== undefined;
        current = stack.pop()
    ) {
        if (current.name === name) {
            return current
        }
        stack.push(...(current.children ?? []))
    }
    throw new Error(`${name} not in tree`)
}

const ids = (...names: string[]) => names.map((name) => byName(tree, name).id)

describe('toTableTree', () => {
    it('maps the four levels to one node shape', () => {
        expect(tree).toMatchObject({ name: 'Company', kind: 'company' })
        expect(byName(tree, 'Branch 1').kind).toBe('branch')
        expect(byName(tree, 'Anna Blackwood').kind).toBe('advisor')
        expect(byName(tree, 'New paid').kind).toBe('channel')
    })

    it('keeps the order of the data', () => {
        expect(tree.children?.map((node) => node.name)).toEqual([
            'Branch 1',
            'Branch 2',
            'Branch 3',
        ])
        expect(byName(tree, 'Branch 1').children?.map((n) => n.name)).toEqual([
            'Anna Blackwood',
            'James Walker',
            'Maria Gutierrez',
            'Robert Chen',
            'Sarah Smith',
        ])
    })

    it('keeps stored values, never sums of children', () => {
        // May 2024: stored 301, branches sum to 279
        expect(tree.values[3]).toBe(301)
        // Aug 2024: stored 214, advisors sum to 216
        expect(byName(tree, 'Branch 1').values[6]).toBe(214)
    })

    it('makes branches without employees leaves', () => {
        for (const name of ['Branch 2', 'Branch 3']) {
            expect(byName(tree, name)).not.toHaveProperty('children')
        }
    })

    it('gives only Anna Blackwood children among the advisors', () => {
        const advisors = byName(tree, 'Branch 1').children ?? []
        expect(
            advisors
                .filter((advisor) => advisor.children !== undefined)
                .map((advisor) => advisor.name)
        ).toEqual(['Anna Blackwood'])
        expect(
            byName(tree, 'Anna Blackwood').children?.map((n) => n.name)
        ).toEqual(['Existing clients', 'New organic', 'New paid'])
    })

    it('treats an empty child list as a leaf', () => {
        const company: Company = {
            ...exampleResponse.company,
            branches: [
                {
                    id: '00000000-0000-4000-8000-000000000099',
                    name: 'Empty',
                    values: exampleResponse.company.values,
                    employees: [],
                },
            ],
        }
        expect(toTableTree(company).children?.[0]).not.toHaveProperty(
            'children'
        )
    })
})

describe('collapseKeys', () => {
    it('closes the row and everything open below it', () => {
        const open = new Set([tree.id, ...ids('Branch 1', 'Anna Blackwood')])

        expect(collapseKeys(open, byName(tree, 'Branch 1').id, tree)).toEqual(
            new Set([tree.id])
        )
    })

    it('leaves rows outside the closed subtree open', () => {
        const open = new Set([tree.id, ...ids('Branch 1', 'Anna Blackwood')])

        expect(
            collapseKeys(open, byName(tree, 'Anna Blackwood').id, tree)
        ).toEqual(new Set([tree.id, ...ids('Branch 1')]))
    })

    it('does not change the given set', () => {
        const open = new Set([tree.id])
        collapseKeys(open, tree.id, tree)
        expect(open).toEqual(new Set([tree.id]))
    })
})

describe('nextExpanded', () => {
    it('adds rows the table opens (Right key)', () => {
        const [branch1] = ids('Branch 1')
        expect(
            nextExpanded(
                new Set([tree.id]),
                new Set([tree.id, branch1 ?? '']),
                tree
            )
        ).toEqual(new Set([tree.id, branch1]))
    })

    it('closes descendants of a row the table closes (Left key)', () => {
        const open = new Set([tree.id, ...ids('Branch 1', 'Anna Blackwood')])
        const requested = new Set([tree.id, ...ids('Anna Blackwood')])

        expect(nextExpanded(open, requested, tree)).toEqual(new Set([tree.id]))
    })

    it('never expands a leaf', () => {
        const requested = new Set([tree.id, ...ids('Branch 2', 'James Walker')])

        expect(nextExpanded(new Set([tree.id]), requested, tree)).toEqual(
            new Set([tree.id])
        )
    })
})

describe('toggleExpanded', () => {
    it('opens Branch 1, then Anna; closing Branch 1 also closes Anna', () => {
        const [branch1 = '', anna = ''] = ids('Branch 1', 'Anna Blackwood')
        let open: ReadonlySet<string> = new Set([tree.id])
        open = toggleExpanded(open, branch1, tree)
        open = toggleExpanded(open, anna, tree)
        expect(open).toEqual(new Set([tree.id, branch1, anna]))

        open = toggleExpanded(open, branch1, tree)
        expect(open).toEqual(new Set([tree.id]))

        // reopened: Anna stays closed
        open = toggleExpanded(open, branch1, tree)
        expect(open).toEqual(new Set([tree.id, branch1]))
    })

    it('does nothing for a leaf', () => {
        const [branch2 = ''] = ids('Branch 2')
        expect(toggleExpanded(new Set([tree.id]), branch2, tree)).toEqual(
            new Set([tree.id])
        )
    })
})
