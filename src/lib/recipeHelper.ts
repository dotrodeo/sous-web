// Port of RecipeHelper.swift. The Swift version memoizes ratios in a static
// cache cleared on refresh; here callers memoize via useMemo over the query
// data, so this stays a pure recompute.
//
// Matching (#39): a household's ingredient links come first (an ingredient
// name means a particular pantry item, or isn't tracked at all); otherwise an
// ingredient fuzzy-matches a pantry item by name.

import { FuzzySearch } from './fuzzySearch'
import { FUZZY_SEARCH_THRESHOLD } from './constants'
import type { Ingredient, IngredientLink, PantryItem, Recipe } from './types'

/** An ingredient paired with its best pantry match (DetailView.swift). */
export interface PantryMatchedIngredient {
    id: number
    ingredient: Ingredient
    pantryItem: PantryItem | null
    /** "Always have, don't track": counts as available, never shopped for. */
    untracked: boolean
    /** The household's link that decided this match, if any. */
    link: IngredientLink | null
}

/** The key links are saved under ("  Green  Onions " → "green onions"); the same
 *  normalization as soupi's. */
export function normalizeIngredientName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** An ingredient's name for matching: its parsed item, else the whole line. */
export function ingredientKey(ingredient: Ingredient): string {
    return normalizeIngredientName(ingredient.item ?? ingredient.sentence)
}

/** Match each recipe ingredient to a pantry item: by the household's links, then
 *  by fuzzy name. */
export function matchIngredientsToPantry(
    recipe: Recipe,
    pantryItems: PantryItem[],
    links: IngredientLink[] = [],
): PantryMatchedIngredient[] {
    const search = new FuzzySearch(pantryItems, (p) => p.name)
    const byName = new Map(links.map((l) => [l.name, l]))
    return (recipe.ingredients ?? []).map((ingredient) => {
        const link = byName.get(ingredientKey(ingredient)) ?? null
        if (link && link.pantryItemId == null) {
            return { id: ingredient.id, ingredient, pantryItem: null, untracked: true, link }
        }
        if (link) {
            const linked = pantryItems.find((p) => p.id === link.pantryItemId)
            // A link to an item that's since been deleted falls back to fuzzy.
            if (linked) {
                return { id: ingredient.id, ingredient, pantryItem: linked, untracked: false, link }
            }
        }
        let pantryItem: PantryItem | null = null
        if (ingredient.item) {
            const top = search.search(ingredient.item)[0]
            if (top && top.score <= FUZZY_SEARCH_THRESHOLD) pantryItem = top.item
        }
        return { id: ingredient.id, ingredient, pantryItem, untracked: false, link: null }
    })
}

/** Whether an ingredient line says it's optional ("parsley, optional"); soupi's rule. */
export function mentionsOptional(sentence: string): boolean {
    return /\boptional\b/i.test(sentence)
}

/** How many of the recipe's required ingredients there are (need) and how many are
 *  covered: in stock, or untracked (have). Optional ingredients count for neither,
 *  so one that's out of stock never makes a recipe look short (#60). */
export function recipeAvailability(
    recipe: Recipe,
    pantryItems: PantryItem[] | null | undefined,
    links: IngredientLink[] = [],
): { have: number; need: number } {
    const required = matchIngredientsToPantry(recipe, pantryItems ?? [], links).filter(
        (m) => !m.ingredient.optional,
    )
    return {
        have: required.filter((m) => m.untracked || m.pantryItem?.isInStock).length,
        need: required.length,
    }
}

/** Fraction of the recipe's required ingredients available in the pantry (0…1). */
export function recipeRatio(
    recipe: Recipe,
    pantryItems: PantryItem[],
    links: IngredientLink[] = [],
): number {
    const { have, need } = recipeAvailability(recipe, pantryItems, links)
    return need === 0 ? 0 : have / need
}
