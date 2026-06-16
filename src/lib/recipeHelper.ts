// Port of RecipeHelper.swift. The Swift version memoizes ratios in a static
// cache cleared on refresh; here callers memoize via useMemo over the query
// data, so this stays a pure recompute.

import { FuzzySearch } from './fuzzySearch'
import { FUZZY_SEARCH_THRESHOLD } from './constants'
import type { Ingredient, PantryItem, Recipe } from './types'

/** An ingredient paired with its best pantry match (DetailView.swift). */
export interface PantryMatchedIngredient {
    id: number
    ingredient: Ingredient
    pantryItem: PantryItem | null
}

/** Fuzzy-match each recipe ingredient to a pantry item by name. */
export function matchIngredientsToPantry(
    recipe: Recipe,
    pantryItems: PantryItem[],
): PantryMatchedIngredient[] {
    const search = new FuzzySearch(pantryItems, (p) => p.name)
    return (recipe.ingredients ?? []).map((ingredient) => {
        let pantryItem: PantryItem | null = null
        if (ingredient.item) {
            const top = search.search(ingredient.item)[0]
            if (top && top.score <= FUZZY_SEARCH_THRESHOLD) pantryItem = top.item
        }
        return { id: ingredient.id, ingredient, pantryItem }
    })
}

/** Pantry items that fuzzy-match an in-stock ingredient of the recipe. */
export function getAvailableIngredients(
    recipe: Recipe,
    pantryItems: PantryItem[] | null | undefined,
): PantryItem[] {
    if (!pantryItems || pantryItems.length === 0) return []
    const ingredients = recipe.ingredients
    if (!ingredients) return []

    const search = new FuzzySearch(pantryItems, (p) => p.name)
    const available: PantryItem[] = []
    for (const ing of ingredients) {
        const itemName = ing.item
        if (!itemName) continue
        const top = search.search(itemName)[0]
        if (top && top.score <= FUZZY_SEARCH_THRESHOLD && top.item.isInStock) {
            available.push(top.item)
        }
    }
    return available
}

/** Fraction of the recipe's ingredients available in the pantry (0…1). */
export function recipeRatio(recipe: Recipe, pantryItems: PantryItem[]): number {
    const ingredients = recipe.ingredients
    if (!ingredients || ingredients.length === 0) return 0
    return getAvailableIngredients(recipe, pantryItems).length / ingredients.length
}
