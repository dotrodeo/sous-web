import { useQuery } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import type { User } from '../lib/types'

/**
 * Fetches the backend user, falling back to /user/sync on first login —
 * mirrors SessionManager.handleAuthEvent() in sous-swift: try GET /user,
 * and if that throws, POST /user/sync to create + return the user.
 */
export function useUser() {
  const api = useApi()
  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<User> => {
      try {
        return await api.get<User>('/user')
      } catch {
        return await api.post<User>('/user/sync')
      }
    },
  })
}

/** Resolves the user's active household, matching the Swift bootstrap logic. */
export function resolveHousehold(user: User | undefined) {
  if (!user) return undefined
  return (
    user.households.find((h) => h.id === user.defaultHouseholdId) ??
    user.households[0]
  )
}

/** The current household, derived from the cached user query. */
export function useActiveHousehold() {
  const { data } = useUser()
  return resolveHousehold(data)
}
