import { defineConfig } from 'orval'

export default defineConfig({
    clients: {
        input: { target: './openapi.yaml' },
        output: {
            client: 'react-query',
            httpClient: 'fetch',
            mode: 'split',
            target: 'src/generated/client/clients.ts',
            // types only, no runtime validation anywhere (no zod): the compiler checks the data shape
            schemas: 'src/generated/model',
            mock: { generators: [{ type: 'msw' }] },
            override: {
                fetch: { forceSuccessResponse: true },
                // optional fields left out, not set to undefined (exactOptionalPropertyTypes)
                mock: { exactOptional: true },
                query: {
                    queryOptions: {
                        path: './src/http/with-request-timeout.ts',
                        name: 'withRequestTimeout',
                        useHooks: false,
                    },
                },
            },
        },
        hooks: { afterAllFilesWrite: 'prettier --write' },
    },
})
