import { exampleResponse } from '@nevis/api-contract/example'
import { clientsResponse } from '@nevis/api-contract/fixtures'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toTableTree } from './clients-table/table-tree'
import { findDataIssues, reportDataIssues } from './data-issues'

const issues = findDataIssues(toTableTree(clientsResponse.company))

afterEach(() => {
    vi.restoreAllMocks()
})

describe('findDataIssues on the delivered data', () => {
    it('finds the 7 stored totals that differ from their children', () => {
        expect(
            issues.sumMismatches.map(
                ({ name, monthIndex, stored, childrenSum }) =>
                    `${name} ${clientsResponse.months[monthIndex] ?? '?'} ${String(stored)}/${String(childrenSum)}`
            )
        ).toEqual([
            'Company 2024-05 301/279',
            'Branch 1 2024-08 214/216',
            'Anna Blackwood 2024-05 31/30',
            'Anna Blackwood 2024-06 32/33',
            'Anna Blackwood 2024-07 34/35',
            'Anna Blackwood 2024-08 38/36',
            'Anna Blackwood 2024-09 27/28',
        ])
    })

    it('finds the 6 nodes with numbers but no breakdown', () => {
        expect(
            issues.missingBreakdowns.map(
                ({ name, kind }) => `${name} (${kind})`
            )
        ).toEqual([
            'James Walker (advisor)',
            'Maria Gutierrez (advisor)',
            'Robert Chen (advisor)',
            'Sarah Smith (advisor)',
            'Branch 2 (branch)',
            'Branch 3 (branch)',
        ])
    })
})

describe('findDataIssues on consistent data', () => {
    it('finds no mismatch, and channels are not a missing breakdown', () => {
        const clean = findDataIssues(toTableTree(exampleResponse.company))

        expect(clean.sumMismatches).toEqual([])
        // Grace Hopper has no channels, South no advisors
        expect(clean.missingBreakdowns.map(({ name }) => name)).toEqual([
            'Grace Hopper',
            'South',
        ])
    })
})

describe('reportDataIssues', () => {
    it('reports once per issue, even when called again (StrictMode)', () => {
        const warn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined)

        reportDataIssues(issues, clientsResponse.months)
        reportDataIssues(issues, clientsResponse.months)

        expect(warn).toHaveBeenCalledTimes(13)
        expect(warn).toHaveBeenCalledWith(
            '[data] Company, May 2024: stored 301, children sum to 279',
            expect.objectContaining({
                kind: 'sum-mismatch',
                month: '2024-05',
                stored: 301,
                childrenSum: 279,
            })
        )
        expect(warn).toHaveBeenCalledWith(
            '[data] Branch 2 (branch) has numbers but no advisor breakdown',
            expect.objectContaining({
                kind: 'missing-breakdown',
                level: 'branch',
            })
        )
    })
})
