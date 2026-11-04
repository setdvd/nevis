import type { ApiError, ClientsResponse } from '@nevis/api-contract/model'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { etag } from 'hono/etag'

import { log } from './log'

const notFound: ApiError = { error: 'not_found' }
const internal: ApiError = { error: 'internal' }

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
