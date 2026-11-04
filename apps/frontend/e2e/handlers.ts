import { clientsResponse } from '@nevis/api-contract/fixtures'
import { getGetClientsMockHandler } from '@nevis/api-contract/mocks'
import type { ClientsResponse } from '@nevis/api-contract/model'
import { delay, http, HttpResponse } from 'msw'

// Fixed responses for GET /clients: the delivered data, a variant of it, or a
// fixed error. Never the generated random data.

const CLIENTS = '*/clients'

// counts the requests a handler answered (e.g. "exactly 2 = 1 retry")
export type RequestCounter = { count: number }

export const counter = (): RequestCounter => ({ count: 0 })

export const clientsLoaded = (
    data: ClientsResponse = clientsResponse,
    requests: RequestCounter = counter()
) =>
    getGetClientsMockHandler(() => {
        requests.count += 1
        return data
    })

export const clientsAfter = (
    ms: number,
    requests: RequestCounter = counter()
) =>
    getGetClientsMockHandler(async () => {
        requests.count += 1
        await delay(ms)
        return clientsResponse
    })

// answers only after open(): lets a test measure the loading state for as
// long as it needs
export const clientsHeld = () => {
    const gate = { open: (): void => undefined }
    const held = new Promise<void>((resolve) => {
        gate.open = resolve
    })
    return {
        handler: getGetClientsMockHandler(async () => {
            await held
            return clientsResponse
        }),
        open: () => {
            gate.open()
        },
    }
}

export const clientsServerError = (
    status: number,
    requests: RequestCounter = counter()
) =>
    http.get(CLIENTS, () => {
        requests.count += 1
        return HttpResponse.json({ error: 'internal' }, { status })
    })

// a 2xx that is not JSON, e.g. a proxy's HTML page
export const clientsNotJson = (requests: RequestCounter = counter()) =>
    http.get(CLIENTS, () => {
        requests.count += 1
        return HttpResponse.html('<html><body>proxy page</body></html>')
    })

export const clientsNetworkError = (requests: RequestCounter = counter()) =>
    http.get(CLIENTS, () => {
        requests.count += 1
        return HttpResponse.error()
    })

// never answers: the request time limit has to end it
export const clientsHang = (requests: RequestCounter = counter()) =>
    http.get(CLIENTS, async () => {
        requests.count += 1
        await delay('infinite')
        return HttpResponse.json({})
    })

// valid JSON with the wrong shape: drawing the page throws
export const clientsBrokenShape = () =>
    http.get(CLIENTS, () =>
        HttpResponse.json({ months: [], company: { name: 'Broken' } })
    )
