// Planned meals that aren't recipes (#67): status and suggestions.
import type { Meal, MealItem, PantryItem, PlanDay } from './types'

/** A meal item's pantry item, from the current pantry when it's loaded (fresher). */
export function mealItemPantry(item: MealItem, pantryItems: PantryItem[]): PantryItem {
    return pantryItems.find((p) => p.id === item.pantryItemId) ?? item.pantryItem
}

/** Required items (need) and how many of them are in stock (have). Optional items
 *  count for neither, as with recipes. */
export function mealAvailability(
    meal: Meal,
    pantryItems: PantryItem[],
): { have: number; need: number } {
    const required = meal.items.filter((i) => !i.optional)
    return {
        have: required.filter((i) => mealItemPantry(i, pantryItems).isInStock).length,
        need: required.length,
    }
}

/** Ids of meals that are on any of these plan days. */
export function plannedMealIds(days: PlanDay[]): Set<number> {
    return new Set(days.flatMap((d) => (d.meals ?? []).map((m) => m.id)))
}

/** Meals to offer when adding one: not already planned, newest first. */
export function mealSuggestions(meals: Meal[], planned: Set<number>, limit = 8): Meal[] {
    return meals.filter((m) => !planned.has(m.id)).slice(0, limit)
}
