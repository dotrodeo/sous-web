import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { planService } from '../lib/services'
import { useActiveHousehold } from './useUser'

/** GET /household/{id}/plan — PlanService.getPlan(). */
export function usePlan() {
  const api = useApi()
  const household = useActiveHousehold()
  return useQuery({
    queryKey: ['plan', household?.id],
    enabled: household != null,
    queryFn: () => planService.get(api, household!.id),
  })
}

/** POST /household/{id}/plan/day — PlanService.addPlanDay(). */
export function useAddPlanDay() {
  const api = useApi()
  const household = useActiveHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, date }: { planId: number; date: string }) =>
      planService.addDay(api, household!.id, planId, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', household?.id] }),
  })
}

/** POST /household/{id}/plan/day/{dayId}/recipes — PlanService.addRecipesToPlan(). */
export function useAddRecipesToPlan() {
  const api = useApi()
  const household = useActiveHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planDayId, recipeIds }: { planDayId: number; recipeIds: number[] }) =>
      planService.addRecipes(api, household!.id, planDayId, recipeIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', household?.id] }),
  })
}

/** DELETE /household/{id}/plan/day/{dayId}/recipes/{recipeId} — PlanService.removeRecipesFromPlan(). */
export function useRemoveRecipeFromPlan() {
  const api = useApi()
  const household = useActiveHousehold()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planDayId, recipeId }: { planDayId: number; recipeId: number }) =>
      planService.removeRecipe(api, household!.id, planDayId, recipeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', household?.id] }),
  })
}
