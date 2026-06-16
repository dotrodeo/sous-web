import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import { createApiClient } from './api'

/**
 * Returns an API client bound to the current Clerk session.
 * getToken() with no args returns the default session JWT — the same token
 * sous-swift sends via `clerk.session?.getToken()?.jwt`.
 */
export function useApi() {
    const { getToken } = useAuth()
    return useMemo(() => createApiClient(() => getToken()), [getToken])
}
