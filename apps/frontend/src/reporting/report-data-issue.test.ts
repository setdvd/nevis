import { afterEach, describe, expect, it, vi } from 'vitest'

import { reportDataIssue } from './report-data-issue'

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
})

describe('reportDataIssue', () => {
    it('warns in dev with the details, once per key', () => {
        const warn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined)
        const report = {
            key: 'test:once',
            message: 'Node, May 2024: stored 3, children sum to 2',
            details: { nodeId: 'n1', stored: 3 },
        }

        reportDataIssue(report)
        reportDataIssue(report)

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn).toHaveBeenCalledWith(
            '[data] Node, May 2024: stored 3, children sum to 2',
            { nodeId: 'n1', stored: 3 }
        )
    })

    it('writes nothing to the console in production', () => {
        vi.stubEnv('DEV', false)
        const warn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined)

        reportDataIssue({ key: 'test:prod', message: 'x', details: {} })

        expect(warn).not.toHaveBeenCalled()
    })
})
