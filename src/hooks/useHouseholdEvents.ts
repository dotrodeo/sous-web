import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeToHouseholdEvents, type SSEEvent } from '../lib/sse'
import { useActiveHousehold } from './useUser'

/**
 * Subscribes to the household SSE stream and invalidates the affected queries
 * as events arrive, keeping every household member's data live. Mirrors the
 * per-ViewModel `listen()` methods in sous-swift, consolidated into one stream.
 *
 * Note: like the Swift app, we refresh on all events including our own — the
 * server's `event.from` could later be used to skip self-originated updates.
 */
export function useHouseholdEvents() {
  const household = useActiveHousehold()
  const householdId = household?.id
  const { getToken } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (householdId == null) return

    const controller = new AbortController()

    function handle(event: SSEEvent) {
      switch (event.type) {
        case 'recipe_update':
        case 'recipe_delete':
          qc.invalidateQueries({ queryKey: ['recipes', householdId] })
          qc.invalidateQueries({ queryKey: ['recipe', householdId] })
          qc.invalidateQueries({ queryKey: ['recipeTags', householdId] })
          // Plan days embed recipes, so refresh the plan too.
          qc.invalidateQueries({ queryKey: ['plan', householdId] })
          break
        case 'pantry_update':
          qc.invalidateQueries({ queryKey: ['pantry', householdId] })
          break
        case 'category_update':
          qc.invalidateQueries({ queryKey: ['pantry', householdId] })
          qc.invalidateQueries({ queryKey: ['categories', householdId] })
          break
        case 'user_update':
          qc.invalidateQueries({ queryKey: ['user'] })
          break
        default:
          break
      }
    }

    subscribeToHouseholdEvents({
      householdId,
      getToken: () => getToken(),
      signal: controller.signal,
      onEvent: handle,
    }).catch(() => {
      // Aborts and fatal errors land here; nothing to do.
    })

    return () => controller.abort()
  }, [householdId, getToken, qc])
}
