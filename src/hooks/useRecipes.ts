import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { recipeService } from '../lib/services'
import { useActiveHousehold } from './useUser'
import type { RecipeCompletion, RecipePatch } from '../lib/types'

/** GET /household/{id}/recipes — RecipeService.fetchRecipes(). */
export function useRecipes() {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['recipes', household?.id],
        enabled: household != null,
        queryFn: () => recipeService.list(api, household!.id),
    })
}

/** GET /household/{id}/recipes/{id} — RecipeService.fetchRecipe(). */
export function useRecipe(id: number | undefined) {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['recipe', household?.id, id],
        enabled: household != null && id != null,
        queryFn: () => recipeService.get(api, household!.id, id!),
    })
}

/** GET /household/{id}/recipes/tags — RecipeService.getAllTags(). */
export function useRecipeTags() {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['recipeTags', household?.id],
        enabled: household != null,
        queryFn: () => recipeService.tags(api, household!.id),
    })
}

/** POST /household/{id}/recipes — RecipeService.upsertRecipe(). */
export function useUpsertRecipe() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (patch: RecipePatch) => recipeService.upsert(api, household!.id, patch),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', household?.id] }),
    })
}

/** DELETE /household/{id}/recipes/{id} — RecipeService.deleteRecipe(). */
export function useDeleteRecipe() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => recipeService.remove(api, household!.id, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', household?.id] }),
    })
}

/** POST /household/{id}/recipes/{id}/made — RecipeService.completeRecipe(). */
export function useCompleteRecipe() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            recipeId,
            completion,
        }: {
            recipeId: number
            completion: RecipeCompletion
        }) => recipeService.complete(api, household!.id, recipeId, completion),
        onSuccess: () => {
            // Completion updates recipe stats, can finish pantry items, and the plan
            // embeds recipes — refresh all three.
            qc.invalidateQueries({ queryKey: ['recipes', household?.id] })
            qc.invalidateQueries({ queryKey: ['pantry', household?.id] })
            qc.invalidateQueries({ queryKey: ['plan', household?.id] })
        },
    })
}

/** GET /household/{id}/recipes/scrape — RecipeService.importRecipe(). */
export function useImportRecipe() {
    const api = useApi()
    const household = useActiveHousehold()
    return useMutation({
        mutationFn: (url: string) => recipeService.import(api, household!.id, url),
    })
}
