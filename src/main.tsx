import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ApiError } from './lib/api'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY (set it in .env.local)')
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Never retry client errors — a 4xx won't fix itself, and retrying a
            // 429 just deepens the rate-limit hole. Allow a couple of retries for
            // genuine transient failures (5xx / network).
            retry: (failureCount, error) => {
                if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                    return false
                }
                return failureCount < 2
            },
        },
    },
    // Surface failed writes (otherwise they fail silently) with the server's
    // response body, which is what we need to diagnose 4xx validation errors.
    mutationCache: new MutationCache({
        onError: (error) => {
            if (error instanceof ApiError) {
                console.error(`API ${error.status}: ${error.message}\n${error.body ?? ''}`)
            } else {
                console.error('Mutation failed:', error)
            }
        },
    }),
})

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </QueryClientProvider>
        </ClerkProvider>
    </StrictMode>,
)
