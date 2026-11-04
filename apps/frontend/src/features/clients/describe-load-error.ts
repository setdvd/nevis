import { InvalidDataError } from '@nevis/api-contract/http'

// short reason for the failures we can tell apart; undefined for anything else
export const describeLoadError = (error: Error): string | undefined => {
    // AbortSignal.timeout in the generated query options
    if (error.name === 'TimeoutError') {
        return 'The request timed out.'
    }
    // fetch rejects with TypeError when the request never got an answer
    if (error instanceof TypeError) {
        return 'Network error.'
    }
    // generated client: non-2xx answers carry the HTTP status
    if ('status' in error && typeof error.status === 'number') {
        return `Server error (${String(error.status)}).`
    }
    if (error instanceof InvalidDataError) {
        return 'The data was not valid.'
    }
    return undefined
}

export const loadErrorMessage = (error: Error): string => {
    const reason = describeLoadError(error)
    return reason === undefined
        ? 'Could not load clients.'
        : `Could not load clients. ${reason}`
}
