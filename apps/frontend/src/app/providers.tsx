import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { createQueryClient } from './query-client'

export type ProvidersProps = {
    children: ReactNode
}

// one client per app instance (not per module), so tests and stories stay apart
export const Providers = ({ children }: ProvidersProps) => {
    const [queryClient] = useState(createQueryClient)
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
