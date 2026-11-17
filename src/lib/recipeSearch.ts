// Recipe search (#40): every word of the query must appear in the recipe's name, its
// ingredients or its notes (#43). An ingredient matched to a pantry item by the household's link
// (#39) also answers to that item's name, so "green onions" finds "scallions".
import { ingredientKey } from './recipeHelper'
import type { IngredientLink, Recipe } from './types'

export interface SearchResult {
    /** Ingredients that matched a word the recipe's name doesn't contain. */
    via: string[]
    /** A word matched only the recipe's notes. */
    inNotes: boolean
}

/** The query split into lowercase words; empty means "no search". */
export function searchWords(query: string): string[] {
    return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/** null when the recipe doesn't match every word. */
export function searchRecipe(
    recipe: Recipe,
    words: string[],
    links: IngredientLink[] = [],
): SearchResult | null {
    if (words.length === 0) return { inNotes: false, via: [] }
    const linkedName = new Map(
        links
            .filter((l) => l.pantryItem && !l.pantryItem.deletedAt)
            .map((l) => [l.name, l.pantryItem!.name]),
    )
    const name = recipe.name.toLowerCase()
    const ingredients = (recipe.ingredients ?? []).map((ing) => ({
        label: (ing.item ?? ing.sentence).trim(),
        text: [ing.sentence, ing.item ?? '', linkedName.get(ingredientKey(ing)) ?? '']
            .join(' ')
            .toLowerCase(),
    }))

    const notes = (recipe.notes ?? '').toLowerCase()

    const via = new Set<string>()
    let inNotes = false
    for (const word of words) {
        if (name.includes(word)) continue
        const hits = ingredients.filter((i) => i.text.includes(word))
        if (hits.length > 0) {
            hits.forEach((h) => via.add(h.label))
            continue
        }
        if (!notes.includes(word)) return null
        inNotes = true
    }
    return { inNotes, via: [...via] }
}
