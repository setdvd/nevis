import { QueryClient } from '@tanstack/react-query'
import type { QueryFunctionContext } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clientsResponse } from '../fixtures/clients'
import {
    getClients,
    getGetClientsQueryOptions,
} from '../generated/client/clients'

import { applyRequestTimeout, InvalidDataError } from './with-request-timeout'

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    })

const stubFetch = (respond: (init?: RequestInit) => Promise<Response>) => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        respond(init)
    )
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

// never answers; rejects with the signal's reason once aborted, like real fetch
const hangUntilAborted = (init?: RequestInit): Promise<Response> =>
    new Promise((_resolve, reject) => {
        const signal = init?.signal
        signal?.addEventListener('abort', () => {
            const reason: unknown = signal.reason
            reject(reason instanceof Error ? reason : new Error('aborted'))
        })
    })

const queryClient = (retry: number | false = false) =>
    new QueryClient({ defaultOptions: { queries: { retry, retryDelay: 0 } } })

const timedClientsQuery = (timeoutMs: number) =>
    applyRequestTimeout(
        {
            queryKey: ['clients-test'],
            queryFn: ({ signal }: QueryFunctionContext<readonly string[]>) =>
                getClients({ signal }),
        },
        timeoutMs
    )

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('generated client', () => {
    it('returns the body of a JSON 200', async () => {
        stubFetch(() => Promise.resolve(json(clientsResponse)))

        const result = await queryClient().query(getGetClientsQueryOptions())

        expect(result.status).toBe(200)
        expect(result.data).toEqual(clientsResponse)
    })

    it('fails with the HTTP status on a JSON error body', async () => {
        stubFetch(() => Promise.resolve(json({ error: 'internal' }, 500)))

        await expect(
            queryClient().query(getGetClientsQueryOptions())
        ).rejects.toMatchObject({ status: 500, info: { error: 'internal' } })
    })

    it('fails with the HTTP status on an empty error body', async () => {
        stubFetch(() => Promise.resolve(new Response(null, { status: 503 })))

        await expect(
            queryClient().query(getGetClientsQueryOptions())
        ).rejects.toMatchObject({ status: 503 })
    })
})

describe('applyRequestTimeout', () => {
    it('turns a non-JSON 2xx body into InvalidDataError', async () => {
        stubFetch(() =>
            Promise.resolve(
                new Response('<html>proxy page</html>', {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                })
            )
        )

        await expect(
            queryClient().query(getGetClientsQueryOptions())
        ).rejects.toBeInstanceOf(InvalidDataError)
    })

    it('rejects a JSON-parsable 2xx body without a JSON content type', async () => {
        stubFetch(() =>
            Promise.resolve(
                new Response('42', {
                    status: 200,
                    headers: { 'content-type': 'text/plain' },
                })
            )
        )

        await expect(
            queryClient().query(getGetClientsQueryOptions())
        ).rejects.toThrow(new InvalidDataError('Expected JSON, got text/plain'))
    })

    it('accepts JSON content types with parameters and suffixes', async () => {
        stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(clientsResponse), {
                    headers: {
                        'content-type':
                            'application/vnd.api+json; charset=utf-8',
                    },
                })
            )
        )

        await expect(
            queryClient().query(getGetClientsQueryOptions())
        ).resolves.toMatchObject({ status: 200 })
    })

    it('aborts an attempt that takes longer than the limit', async () => {
        stubFetch(hangUntilAborted)

        await expect(
            queryClient().query(timedClientsQuery(20))
        ).rejects.toMatchObject({ name: 'TimeoutError' })
    })

    it('gives a retry a fresh limit', async () => {
        const fetchMock = stubFetch(hangUntilAborted)
        const started = performance.now()

        await expect(
            queryClient(1).query(timedClientsQuery(50))
        ).rejects.toMatchObject({ name: 'TimeoutError' })

        expect(fetchMock).toHaveBeenCalledTimes(2)
        // two full limits, not one shared limit
        expect(performance.now() - started).toBeGreaterThanOrEqual(95)
    })

    it('aborts the running request when the query is cancelled', async () => {
        const fetchMock = stubFetch(hangUntilAborted)
        const client = queryClient()
        const query = client.query(timedClientsQuery(10_000))

        await vi.waitFor(() => {
            expect(fetchMock).toHaveBeenCalledOnce()
        })
        await client.cancelQueries({ queryKey: ['clients-test'] })

        await expect(query).rejects.toMatchObject({ revert: true })
        expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    })
})
