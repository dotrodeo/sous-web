// "Shop for the plan": what the upcoming meal plan's recipes need that the pantry
// doesn't have, merged across recipes.
import { matchIngredientsToPantry } from './recipeHelper'
import type { IngredientLink, PantryItem, PlanDay, Recipe } from './types'

export type PlanShoppingStatus =
    /** Out of stock, or not in the pantry at all: added by default. */
    | 'missing'
    /** In stock but running low: offered, not added by default. */
    | 'low'
    /** Already on the shopping list: shown for context, nothing to do. */
    | 'listed'

export interface PlanShoppingRow {
    key: string
    name: string
    /** The pantry item, or null for an ingredient not in the pantry yet (added by name). */
    itemId: number | null
    status: PlanShoppingStatus
    /** Names of the planned recipes that need it. */
    recipes: string[]
}

const ORDER: Record<PlanShoppingStatus, number> = { missing: 0, low: 1, listed: 2 }

function statusOf(item: PantryItem): PlanShoppingStatus | null {
    if (item.isInShoppingList) return 'listed'
    if (!item.isInStock) return 'missing'
    if (item.isLow) return 'low'
    return null // in stock
}

export function buildPlanShopping(
    days: PlanDay[],
    recipeById: Map<number, Recipe>,
    pantryItems: PantryItem[],
    links: IngredientLink[] = [],
): { rows: PlanShoppingRow[]; recipeCount: number } {
    // A recipe planned on two days is shopped for once.
    const recipes = new Map<number, Recipe>()
    days.forEach((d) => d.recipes.forEach((r) => recipes.set(r.id, recipeById.get(r.id) ?? r)))

    const rows = new Map<string, PlanShoppingRow>()
    for (const recipe of recipes.values()) {
        for (const m of matchIngredientsToPantry(recipe, pantryItems, links)) {
            if (m.untracked) continue // "always have, don't track"
            if (m.ingredient.optional) continue // optional: added from the recipe page if wanted
            const item = m.pantryItem
            const status = item ? statusOf(item) : 'missing'
            if (!status) continue
            const name = (item?.name ?? m.ingredient.item ?? m.ingredient.sentence).trim()
            if (!name) continue
            const key = item ? `item:${item.id}` : `name:${name.toLowerCase()}`
            const row = rows.get(key)
            if (row) {
                if (!row.recipes.includes(recipe.name)) row.recipes.push(recipe.name)
            } else {
                rows.set(key, {
                    key,
                    name,
                    itemId: item?.id ?? null,
                    status,
                    recipes: [recipe.name],
                })
            }
        }
    }

    const sorted = [...rows.values()].sort(
        (a, b) =>
            ORDER[a.status] - ORDER[b.status] ||
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    sorted.forEach((r) => r.recipes.sort((a, b) => a.localeCompare(b)))
    return { rows: sorted, recipeCount: recipes.size }
}
