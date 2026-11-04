import { serve } from '@hono/node-server'
import { clientsResponse } from '@nevis/api-contract/fixtures'

import { createApp } from './app'
import { log } from './log'

// fixed: the frontend proxy and the browser tests expect this port
const PORT = 8787

const server = serve(
    { fetch: createApp(clientsResponse).fetch, port: PORT },
    (info) => {
        log('info', 'server.listening', { port: info.port })
    }
)

// e.g. port taken: fail with a log line instead of using another port
server.on('error', (error: Error) => {
    log('error', 'server.error', { port: PORT, message: error.message })
    process.exit(1)
})
