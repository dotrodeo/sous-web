import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../lib/api'
import { useApi } from '../lib/useApi'
import type { User } from '../lib/types'

/**
 * Fetches the backend user, falling back to /user/sync on first login —
 * mirrors SessionManager.handleAuthEvent() in sous-swift: try GET /user,
 * and if it's a 404 (no user yet), POST /user/sync to create + return it.
 *
 * Only a 404 triggers the sync. Falling back on *any* error is dangerous:
 * /user/sync broadcasts a user_update SSE event, which invalidates ['user']
 * and refetches — so a transient failure (429 rate-limit, 401, 5xx) would
 * spin GET → sync → SSE → refetch → GET into a request storm that trips the
 * backend rate limiter and sustains itself.
 */
export function useUser() {
    const api = useApi()
    return useQuery({
        queryKey: ['user'],
        queryFn: async (): Promise<User> => {
            try {
                return await api.get<User>('/user')
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    return await api.post<User>('/user/sync')
                }
                throw err
            }
        },
    })
}

/** Resolves the user's active household, matching the Swift bootstrap logic. */
export function resolveHousehold(user: User | undefined) {
    if (!user) return undefined
    return user.households.find((h) => h.id === user.defaultHouseholdId) ?? user.households[0]
}

/** The current household, derived from the cached user query. */
export function useActiveHousehold() {
    const { data } = useUser()
    return resolveHousehold(data)
}
