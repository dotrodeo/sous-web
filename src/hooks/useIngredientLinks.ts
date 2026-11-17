import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { ingredientLinkService } from '../lib/services'
import { useActiveHousehold } from './useUser'

/** GET /household/{id}/ingredient-links — the household's ingredient match fixes. */
export function useIngredientLinks() {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['ingredientLinks', household?.id],
        enabled: household != null,
        queryFn: () => ingredientLinkService.list(api, household!.id),
    })
}

/** PUT /household/{id}/ingredient-links — match an ingredient to a pantry item, or
 *  `pantryItemId: null` for "always have, don't track". */
export function useSetIngredientLink() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (body: { name: string; pantryItemId: number | null }) =>
            ingredientLinkService.upsert(api, household!.id, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredientLinks', household?.id] }),
    })
}

/** DELETE /household/{id}/ingredient-links/{linkId} — back to automatic matching. */
export function useRemoveIngredientLink() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => ingredientLinkService.remove(api, household!.id, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ingredientLinks', household?.id] }),
    })
}
