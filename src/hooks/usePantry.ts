import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { pantryService } from '../lib/services'
import { useActiveHousehold } from './useUser'
import type { ItemCategoryPatch, PantryItemPatch } from '../lib/types'

/** GET /household/{id}/pantry — PantryService.fetchPantry(). */
export function usePantry() {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['pantry', household?.id],
        enabled: household != null,
        queryFn: () => pantryService.fetch(api, household!.id),
    })
}

/** GET /household/{id}/pantry/{pantryId}/category — PantryService.fetchCategories(). */
export function useCategories(pantryId: number | undefined) {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['categories', household?.id, pantryId],
        enabled: household != null && pantryId != null,
        queryFn: () => pantryService.categories(api, household!.id, pantryId!),
    })
}

/** POST /household/{id}/pantry/{pantryId} — PantryService.upsertPantryItem(). */
export function useUpsertPantryItem() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ pantryId, patch }: { pantryId: number; patch: PantryItemPatch }) =>
            pantryService.upsertItem(api, household!.id, pantryId, patch),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', household?.id] }),
    })
}

/** POST /household/{id}/pantry/{pantryId}/category — PantryService.upsertCategory(). */
export function useUpsertCategory() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ pantryId, patch }: { pantryId: number; patch: ItemCategoryPatch }) =>
            pantryService.upsertCategory(api, household!.id, pantryId, patch),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pantry', household?.id] })
            qc.invalidateQueries({ queryKey: ['categories', household?.id] })
        },
    })
}

/** POST /household/{id}/pantry/{pantryId}/category/sort-order — PantryService.updateCategorySortOrder(). */
export function useUpdateCategorySortOrder() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ pantryId, categoryIds }: { pantryId: number; categoryIds: number[] }) =>
            pantryService.updateCategorySortOrder(api, household!.id, pantryId, categoryIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pantry', household?.id] })
            qc.invalidateQueries({ queryKey: ['categories', household?.id] })
        },
    })
}
