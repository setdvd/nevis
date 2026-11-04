import { skipToken } from '@tanstack/react-query'
import type { QueryFunction, QueryKey } from '@tanstack/react-query'

const REQUEST_TIMEOUT_MS = 10_000

// 2xx answer that is not JSON (e.g. an HTML page from a proxy)
export class InvalidDataError extends Error {
    override readonly name = 'InvalidDataError'
}

const isJsonContentType = (value: string | null): boolean =>
    value !== null && /^application\/([\w.+-]+\+)?json\s*(;|$)/i.test(value)

const hasHeaders = (value: unknown): value is { readonly headers: Headers } =>
    typeof value === 'object' &&
    value !== null &&
    'headers' in value &&
    value.headers instanceof Headers

// shape orval passes in: the generated query options
type QueryOptionsInput<TData, TKey extends QueryKey> = {
    readonly queryKey: TKey
    readonly queryFn?: QueryFunction<TData, TKey> | typeof skipToken
}

// Each attempt gets its own timeout, so a retry starts with the full limit.
// The generated fetch parses the body before returning: a non-JSON 2xx body
// throws SyntaxError there. A non-JSON error body (e.g. 502 HTML) throws
// SyntaxError too, before the status is set, so it also ends up here.
// Timeout as a param: tests pass a short one (fake timers do not drive AbortSignal.timeout).
export const applyRequestTimeout = <
    TData,
    TKey extends QueryKey,
    TOptions extends QueryOptionsInput<TData, TKey>,
>(
    options: TOptions & QueryOptionsInput<TData, TKey>,
    timeoutMs: number
): TOptions => {
    const { queryFn } = options
    if (queryFn === undefined || queryFn === skipToken) {
        return options
    }
    const timed: QueryFunction<TData, TKey> = async (context) => {
        const signal = AbortSignal.any([
            context.signal,
            AbortSignal.timeout(timeoutMs),
        ])
        let result: TData
        try {
            result = await queryFn({ ...context, signal })
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new InvalidDataError('Response is not JSON', {
                    cause: error,
                })
            }
            throw error
        }
        if (hasHeaders(result)) {
            const contentType = result.headers.get('content-type')
            if (!isJsonContentType(contentType)) {
                throw new InvalidDataError(
                    `Expected JSON, got ${contentType ?? 'no content type'}`
                )
            }
        }
        return result
    }
    return { ...options, queryFn: timed }
}

export const withRequestTimeout = <
    TData,
    TKey extends QueryKey,
    TOptions extends QueryOptionsInput<TData, TKey>,
>(
    options: TOptions & QueryOptionsInput<TData, TKey>
): TOptions => applyRequestTimeout(options, REQUEST_TIMEOUT_MS)
