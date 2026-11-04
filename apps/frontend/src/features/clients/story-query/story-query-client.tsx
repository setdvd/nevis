import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

export type StoryQueryClientProps = {
    children: ReactNode
}

// Stories only: a fresh client per story, so states never leak between stories.
export const StoryQueryClient = ({ children }: StoryQueryClientProps) => {
    const [client] = useState(() => new QueryClient())
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
