// Planned meals that aren't recipes (#67).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { mealService, planService } from '../lib/services'
import type { MealCompletion, MealPatch } from '../lib/types'
import { useActiveHousehold } from './useUser'

/** Invalidates what a meal change can affect: the meal list and the plan. */
function useRefresh() {
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return () => {
        qc.invalidateQueries({ queryKey: ['meals', household?.id] })
        qc.invalidateQueries({ queryKey: ['plan', household?.id] })
    }
}

/** GET /household/{id}/meals: newest first, for suggestions. */
export function useMeals() {
    const api = useApi()
    const household = useActiveHousehold()
    return useQuery({
        queryKey: ['meals', household?.id],
        enabled: household != null,
        queryFn: () => mealService.list(api, household!.id),
    })
}

/** POST /household/{id}/meals */
export function useUpsertMeal() {
    const api = useApi()
    const household = useActiveHousehold()
    const refresh = useRefresh()
    return useMutation({
        mutationFn: (patch: MealPatch) => mealService.upsert(api, household!.id, patch),
        onSuccess: refresh,
    })
}

/** DELETE /household/{id}/meals/{mealId}: dismiss (no longer offered). */
export function useDeleteMeal() {
    const api = useApi()
    const household = useActiveHousehold()
    const refresh = useRefresh()
    return useMutation({
        mutationFn: (id: number) => mealService.remove(api, household!.id, id),
        onSuccess: refresh,
    })
}

/** POST /household/{id}/meals/{mealId}/made: updates the pantry, leaves the plan. */
export function useCompleteMeal() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    const refresh = useRefresh()
    return useMutation({
        mutationFn: ({ id, completion }: { id: number; completion: MealCompletion }) =>
            mealService.complete(api, household!.id, id, completion),
        onSuccess: () => {
            refresh()
            qc.invalidateQueries({ queryKey: ['pantry', household?.id] })
        },
    })
}

/** POST /household/{id}/plan/day/{dayId}/meals */
export function useAddMealsToPlan() {
    const api = useApi()
    const household = useActiveHousehold()
    const refresh = useRefresh()
    return useMutation({
        mutationFn: ({ planDayId, mealIds }: { planDayId: number; mealIds: number[] }) =>
            planService.addMeals(api, household!.id, planDayId, mealIds),
        onSuccess: refresh,
    })
}

/** DELETE /household/{id}/plan/day/{dayId}/meals/{mealId}: the meal is kept. */
export function useRemoveMealFromPlan() {
    const api = useApi()
    const household = useActiveHousehold()
    const refresh = useRefresh()
    return useMutation({
        mutationFn: ({ planDayId, mealId }: { planDayId: number; mealId: number }) =>
            planService.removeMeal(api, household!.id, planDayId, mealId),
        onSuccess: refresh,
    })
}
