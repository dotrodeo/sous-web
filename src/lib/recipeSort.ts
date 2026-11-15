// Sort orders for the recipes list.

export type RecipeSort = 'ready' | 'az' | 'popular' | 'recent'

export const RECIPE_SORTS: { value: RecipeSort; label: string }[] = [
    { value: 'ready', label: 'ready to cook' },
    { value: 'az', label: 'a–z' },
    { value: 'popular', label: 'most made' },
    { value: 'recent', label: 'recently made' },
]

export const DEFAULT_RECIPE_SORT: RecipeSort = 'ready'

export function isRecipeSort(value: unknown): value is RecipeSort {
    return RECIPE_SORTS.some((s) => s.value === value)
}

/** What a recipe needs for sorting: its name, pantry coverage and history. */
export interface SortableRecipe {
    name: string
    /** In-stock ingredients / total ingredients. */
    have: number
    need: number
    timesMade: number
    lastMade: string | null
}

/** 0 = everything in stock (green), 1 = some (yellow), 2 = none or no ingredients (gray). */
export function readiness({ have, need }: Pick<SortableRecipe, 'have' | 'need'>): 0 | 1 | 2 {
    if (need <= 0 || have <= 0) return 2
    return have >= need ? 0 : 1
}

const byName = (a: SortableRecipe, b: SortableRecipe) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

const madeAt = (r: SortableRecipe) => (r.lastMade ? Date.parse(r.lastMade) || 0 : 0)

export function sortRecipes<T extends SortableRecipe>(rows: T[], sort: RecipeSort): T[] {
    const sorted = [...rows]
    switch (sort) {
        case 'az':
            return sorted.sort(byName)
        case 'popular':
            return sorted.sort((a, b) => b.timesMade - a.timesMade || byName(a, b))
        case 'recent':
            // Never-made recipes (no lastMade) go last, alphabetically.
            return sorted.sort((a, b) => madeAt(b) - madeAt(a) || byName(a, b))
        case 'ready':
        default:
            return sorted.sort((a, b) => readiness(a) - readiness(b) || byName(a, b))
    }
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago". */
export function madeAgo(lastMade: string | null, now = Date.now()): string {
    if (!lastMade) return 'never made'
    const days = Math.floor((now - Date.parse(lastMade)) / 86_400_000)
    if (days <= 0) return 'made today'
    if (days === 1) return 'made yesterday'
    if (days < 14) return `made ${days} days ago`
    if (days < 60) return `made ${Math.floor(days / 7)} weeks ago`
    if (days < 730) return `made ${Math.floor(days / 30)} months ago`
    return `made ${Math.floor(days / 365)} years ago`
}
