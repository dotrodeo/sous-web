// Typed API functions mirroring sous-swift/Services/*.swift. Each takes the
// Clerk-bound ApiClient plus the household id, matching the Swift *Service
// classes that capture an APIHelper + householdId. Query/mutation hooks in
// src/hooks wrap these.

import type { ApiClient } from './api'
import type {
    Household,
    ItemCategory,
    Pantry,
    PantryItem,
    PantryItemPatch,
    ItemCategoryPatch,
    Plan,
    Recipe,
    RecipeCompletion,
    RecipeImport,
    RecipePatch,
    RecipeTag,
} from './types'

/** RecipeService.swift */
export const recipeService = {
    list: (api: ApiClient, hid: number) => api.get<Recipe[]>(`/household/${hid}/recipes`),
    get: (api: ApiClient, hid: number, id: number) =>
        api.get<Recipe>(`/household/${hid}/recipes/${id}`),
    upsert: (api: ApiClient, hid: number, patch: RecipePatch) =>
        api.post<Recipe>(`/household/${hid}/recipes`, patch),
    import: (api: ApiClient, hid: number, url: string) =>
        api.get<RecipeImport | undefined>(`/household/${hid}/recipes/scrape`, { url }),
    remove: (api: ApiClient, hid: number, id: number) =>
        api.delete(`/household/${hid}/recipes/${id}`),
    tags: (api: ApiClient, hid: number) => api.get<RecipeTag[]>(`/household/${hid}/recipes/tags`),
    complete: (api: ApiClient, hid: number, recipeId: number, completion: RecipeCompletion) =>
        api.post<void>(`/household/${hid}/recipes/${recipeId}/made`, completion),
}

/** PantryService.swift */
export const pantryService = {
    fetch: (api: ApiClient, hid: number) => api.get<Pantry>(`/household/${hid}/pantry`),
    upsertItem: (api: ApiClient, hid: number, pantryId: number, patch: PantryItemPatch) =>
        api.post<PantryItem>(`/household/${hid}/pantry/${pantryId}`, patch),
    categories: (api: ApiClient, hid: number, pantryId: number) =>
        api.get<ItemCategory[]>(`/household/${hid}/pantry/${pantryId}/category`),
    upsertCategory: (api: ApiClient, hid: number, pantryId: number, patch: ItemCategoryPatch) =>
        api.post<ItemCategory>(`/household/${hid}/pantry/${pantryId}/category`, patch),
    updateCategorySortOrder: (
        api: ApiClient,
        hid: number,
        pantryId: number,
        categoryIds: number[],
    ) =>
        api.post<ItemCategory[]>(
            `/household/${hid}/pantry/${pantryId}/category/sort-order`,
            categoryIds,
        ),
}

/** PlanService.swift */
export const planService = {
    get: (api: ApiClient, hid: number) => api.get<Plan>(`/household/${hid}/plan`),
    addDay: (api: ApiClient, hid: number, planId: number, date: string) =>
        api.post<Plan>(`/household/${hid}/plan/day`, { planId, date }),
    addRecipes: (api: ApiClient, hid: number, planDayId: number, recipeIds: number[]) =>
        api.post<void>(`/household/${hid}/plan/day/${planDayId}/recipes`, recipeIds),
    removeRecipe: (api: ApiClient, hid: number, planDayId: number, recipeId: number) =>
        api.delete(`/household/${hid}/plan/day/${planDayId}/recipes/${recipeId}`),
}

/** HouseholdService.swift */
export const householdService = {
    join: (api: ApiClient, hid: number, joinToken: string) =>
        api.post<Household>(`/household/${hid}/join`, { joinToken }),
}
