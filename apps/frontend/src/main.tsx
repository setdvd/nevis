import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppErrorBoundary } from './app/app-error-boundary'
import { DashboardPage } from './app/dashboard-page'
import { Providers } from './app/providers'
import './index.css'

const rootElement = document.getElementById('root')
if (rootElement === null) {
    throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
    <StrictMode>
        <AppErrorBoundary>
            <Providers>
                <DashboardPage />
            </Providers>
        </AppErrorBoundary>
    </StrictMode>
)
