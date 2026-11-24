// Typed API functions mirroring sous-swift/Services/*.swift. Each takes the
// Clerk-bound ApiClient plus the household id, matching the Swift *Service
// classes that capture an APIHelper + householdId. Query/mutation hooks in
// src/hooks wrap these.

import type { ApiClient } from './api'
import type {
    Household,
    IngredientLink,
    ItemCategory,
    ItemCategoryPatch,
    Meal,
    MealCompletion,
    MealPatch,
    Pantry,
    PantryItem,
    PantryItemPatch,
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
    /** Puts several items on the list at once (existing ids, plus names for new items). */
    addToList: (
        api: ApiClient,
        hid: number,
        pantryId: number,
        items: { itemIds: number[]; names: string[] },
    ) => api.post<{ added: number }>(`/household/${hid}/pantry/${pantryId}/shopping-list`, items),
    deleteItem: (api: ApiClient, hid: number, pantryId: number, itemId: number) =>
        api.delete(`/household/${hid}/pantry/${pantryId}/items/${itemId}`),
    categories: (api: ApiClient, hid: number, pantryId: number) =>
        api.get<ItemCategory[]>(`/household/${hid}/pantry/${pantryId}/category`),
    upsertCategory: (api: ApiClient, hid: number, pantryId: number, patch: ItemCategoryPatch) =>
        api.post<ItemCategory>(`/household/${hid}/pantry/${pantryId}/category`, patch),
    deleteCategory: (api: ApiClient, hid: number, pantryId: number, categoryId: number) =>
        api.delete(`/household/${hid}/pantry/${pantryId}/category/${categoryId}`),
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

/** Ingredient links (#39): fixes for how recipe ingredients match the pantry. */
export const ingredientLinkService = {
    list: (api: ApiClient, hid: number) =>
        api.get<IngredientLink[]>(`/household/${hid}/ingredient-links`),
    upsert: (api: ApiClient, hid: number, body: { name: string; pantryItemId: number | null }) =>
        api.put<IngredientLink>(`/household/${hid}/ingredient-links`, body),
    remove: (api: ApiClient, hid: number, id: number) =>
        api.delete(`/household/${hid}/ingredient-links/${id}`),
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
    addMeals: (api: ApiClient, hid: number, planDayId: number, mealIds: number[]) =>
        api.post<void>(`/household/${hid}/plan/day/${planDayId}/meals`, mealIds),
    removeMeal: (api: ApiClient, hid: number, planDayId: number, mealId: number) =>
        api.delete(`/household/${hid}/plan/day/${planDayId}/meals/${mealId}`),
}

/** HouseholdService.swift */
export const householdService = {
    join: (api: ApiClient, hid: number, joinToken: string) =>
        api.post<Household>(`/household/${hid}/join`, { joinToken }),
}

/** Planned meals that aren't recipes (#67, soupi 2.9.0+). */
export const mealService = {
    list: (api: ApiClient, hid: number) => api.get<Meal[]>(`/household/${hid}/meals`),
    upsert: (api: ApiClient, hid: number, patch: MealPatch) =>
        api.post<Meal>(`/household/${hid}/meals`, patch),
    remove: (api: ApiClient, hid: number, id: number) =>
        api.delete(`/household/${hid}/meals/${id}`),
    complete: (api: ApiClient, hid: number, id: number, completion: MealCompletion) =>
        api.post<void>(`/household/${hid}/meals/${id}/made`, completion),
}
