import { readFileSync } from 'node:fs'

import { clientsResponse } from '@nevis/api-contract/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'

import { createApp } from './app'

const ADVISOR_IDS = clientsResponse.company.branches.flatMap((branch) =>
    (branch.employees ?? []).map(({ id }) => id)
)
const ANNA = 'e3c4637b-2f21-4b7e-883e-b13ae1a6df6a'

const logLines = (spy: MockInstance<typeof console.info>): unknown[] =>
    spy.mock.calls.map(([line]) => JSON.parse(String(line)) as unknown)

let info: MockInstance<typeof console.info>
let error: MockInstance<typeof console.error>

beforeEach(() => {
    info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('GET /clients', () => {
    it('serves the data unchanged as JSON', async () => {
        const res = await createApp(clientsResponse).request('/clients')

        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toMatch(/^application\/json/)
        expect(await res.json()).toEqual(clientsResponse)
    })

    it('keeps stored totals that differ from the sum of children', async () => {
        const res = await createApp(clientsResponse).request('/clients')
        const body = (await res.json()) as typeof clientsResponse

        // May 2024: stored 301, branches sum to 279
        expect(body.months[3]).toBe('2024-05')
        expect(body.company.values[3]).toBe(301)
    })

    it('answers 304 to a matching ETag', async () => {
        const app = createApp(clientsResponse)
        const first = await app.request('/clients')
        const tag = first.headers.get('etag')

        expect(first.headers.get('cache-control')).toBe('no-cache')
        expect(tag).not.toBeNull()

        const second = await app.request('/clients', {
            headers: { 'if-none-match': tag ?? '' },
        })
        expect(second.status).toBe(304)
        expect(await second.text()).toBe('')
    })

    it('compresses when the client accepts gzip', async () => {
        const res = await createApp(clientsResponse).request('/clients', {
            headers: { 'accept-encoding': 'gzip' },
        })

        expect(res.headers.get('content-encoding')).toBe('gzip')
    })

    it('logs one JSON line per request', async () => {
        await createApp(clientsResponse).request('/clients')

        expect(logLines(info)).toEqual([
            expect.objectContaining({
                level: 'info',
                event: 'http.request',
                method: 'GET',
                path: '/clients',
                status: 200,
            }),
        ])
    })
})

describe('GET /avatars/<advisorId>.jpg (mock CDN)', () => {
    it.each(ADVISOR_IDS)('serves the photo file of advisor %s', async (id) => {
        const res = await createApp(clientsResponse).request(
            `/avatars/${id}.jpg`
        )

        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toBe('image/jpeg')
        expect(res.headers.get('cache-control')).toBe('public, max-age=86400')
        const file = readFileSync(
            new URL(`../static/avatars/${id}.jpg`, import.meta.url)
        )
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(
            new Uint8Array(file)
        )
    })

    it('does not gzip an image', async () => {
        const res = await createApp(clientsResponse).request(
            `/avatars/${ANNA}.jpg`,
            {
                headers: { 'accept-encoding': 'gzip' },
            }
        )

        expect(res.headers.get('content-encoding')).toBeNull()
    })

    it('answers 304 to a matching ETag', async () => {
        const app = createApp(clientsResponse)
        const tag = (await app.request(`/avatars/${ANNA}.jpg`)).headers.get(
            'etag'
        )

        expect(tag).not.toBeNull()
        const res = await app.request(`/avatars/${ANNA}.jpg`, {
            headers: { 'if-none-match': tag ?? '' },
        })
        expect(res.status).toBe(304)
    })

    it.each([
        ['the company (no file)', `/avatars/${clientsResponse.company.id}.jpg`],
        ['an unknown id', '/avatars/nope.jpg'],
        ['the folder itself', '/avatars/'],
        ['a path outside the folder', '/avatars/../src/app.ts'],
        ['an encoded path outside the folder', '/avatars/..%2Fsrc%2Fapp.ts'],
    ])('answers 404 JSON for %s', async (_what, path) => {
        const res = await createApp(clientsResponse).request(path)

        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'not_found' })
    })
})

describe('errors', () => {
    it('answers unknown routes with 404 JSON', async () => {
        const res = await createApp(clientsResponse).request('/nope')

        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'not_found' })
    })

    it('answers other methods on /clients with 404 JSON', async () => {
        const res = await createApp(clientsResponse).request('/clients', {
            method: 'POST',
        })

        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({ error: 'not_found' })
    })

    it('answers unhandled errors with 500 JSON, message only in the log', async () => {
        const app = createApp(clientsResponse)
        app.get('/boom', () => {
            throw new Error('secret detail')
        })

        const res = await app.request('/boom')

        expect(res.status).toBe(500)
        expect(await res.text()).toBe('{"error":"internal"}')
        expect(logLines(error)).toEqual([
            expect.objectContaining({
                level: 'error',
                event: 'http.unhandled_error',
                method: 'GET',
                path: '/boom',
                message: 'secret detail',
            }),
        ])
        expect(logLines(info)).toEqual([
            expect.objectContaining({ event: 'http.request', status: 500 }),
        ])
    })
})
