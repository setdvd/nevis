import { InvalidDataError } from '@nevis/api-contract/http'

import type { LoadErrorReason } from '../../i18n/messages'

// Why loading failed, as far as we can tell; undefined for anything else. A
// code, not text: the messages turn it into words (i18n/en.ts).
export const loadErrorReason = (error: Error): LoadErrorReason | undefined => {
    // AbortSignal.timeout in the generated query options
    if (error.name === 'TimeoutError') {
        return { kind: 'timeout' }
    }
    // fetch rejects with TypeError when the request never got an answer
    if (error instanceof TypeError) {
        return { kind: 'network' }
    }
    // generated client: non-2xx answers carry the HTTP status
    if ('status' in error && typeof error.status === 'number') {
        return { kind: 'server', status: error.status }
    }
    if (error instanceof InvalidDataError) {
        return { kind: 'invalidData' }
    }
    return undefined
}
