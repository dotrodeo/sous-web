import { useQuery } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import type { Recipe } from '../lib/types'

/**
 * GET /household/{id}/recipes — mirrors RecipeService.fetchRecipes().
 * Disabled until we know which household to query.
 */
export function useRecipes(householdId: number | undefined) {
  const api = useApi()
  return useQuery({
    queryKey: ['recipes', householdId],
    enabled: householdId != null,
    queryFn: () => api.get<Recipe[]>(`/household/${householdId}/recipes`),
  })
}
