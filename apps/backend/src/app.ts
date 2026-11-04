import { fileURLToPath } from 'node:url'

import { serveStatic } from '@hono/node-server/serve-static'
import type { ApiError, ClientsResponse } from '@nevis/api-contract/model'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { etag } from 'hono/etag'

import { log } from './log'

const notFound: ApiError = { error: 'not_found' }
const internal: ApiError = { error: 'internal' }

// absolute: works whatever folder the server is started from
const STATIC_ROOT = fileURLToPath(new URL('../static', import.meta.url))

// Serves the data as is: no runtime validation (the fixture is type-checked)
// and no data checks. The checks (stored totals vs sum of children, missing
// channels) run on the FE for now, to ship faster.
// TODO(BE team): agree on fixing the data discrepancies at the source; then the
// checks can move here.
export const createApp = (response: ClientsResponse): Hono => {
    const app = new Hono()

    app.use(async (c, next) => {
        const started = performance.now()
        await next()
        log('info', 'http.request', {
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            durationMs: Math.round(performance.now() - started),
        })
    })
    app.use(compress())

    // no-cache + ETag: the browser always asks, an unchanged payload costs a 304
    app.get('/clients', etag(), (c) => {
        c.header('Cache-Control', 'no-cache')
        return c.json(response)
    })

    // Mock CDN: static/avatars/<advisorId>.jpg, the FE builds the URL from the id.
    // In production these files belong on a CDN (edge cache, resizing per device,
    // no load on the API server), not on this server. Missing file -> 404 JSON.
    // Images are not gzipped: compress() skips already compressed types.
    // Cache-Control set on the finished response: serveStatic's onFound runs
    // after the response is built, so a header set there is lost.
    app.use(
        '/avatars/*',
        async (c, next) => {
            await next()
            if (c.res.status === 200 || c.res.status === 304) {
                c.res.headers.set('Cache-Control', 'public, max-age=86400')
            }
        },
        etag(),
        serveStatic({ root: STATIC_ROOT })
    )

    app.notFound((c) => c.json(notFound, 404))
    // message goes to the log only, never to the client
    app.onError((error, c) => {
        log('error', 'http.unhandled_error', {
            method: c.req.method,
            path: c.req.path,
            message: error.message,
        })
        return c.json(internal, 500)
    })

    return app
}
