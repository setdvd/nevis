import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'

const rootElement = document.getElementById('root')
if (rootElement === null) {
    throw new Error('Root element #root not found')
}

// scaffold only: providers, error boundary and DashboardPage come in Phase 4
createRoot(rootElement).render(
    <StrictMode>
        <main className="mx-auto box-content flex max-w-content flex-col gap-4 px-4 py-6">
            <h1 className="text-display font-normal">Clients</h1>
        </main>
    </StrictMode>
)
