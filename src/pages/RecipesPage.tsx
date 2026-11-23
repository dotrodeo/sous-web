import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ChevronDownIcon, SearchIcon } from '../components/Icons'
import { useRecipes } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { useIngredientLinks } from '../hooks/useIngredientLinks'
import { recipeAvailability } from '../lib/recipeHelper'
import { searchRecipe, searchWords } from '../lib/recipeSearch'
import {
    DEFAULT_RECIPE_SORT,
    RECIPE_SORTS,
    isRecipeSort,
    madeAgo,
    readiness,
    sortRecipes,
    type RecipeSort,
} from '../lib/recipeSort'
import type { PantryItem, Recipe } from '../lib/types'

interface RecipeRow {
    recipe: Recipe
    name: string
    have: number
    need: number
    timesMade: number
    lastMade: string | null
    dotColor: string
    tags: string[]
}

/** Dot color by readiness: green = all in stock, yellow = some, gray = none. */
const READINESS_COLOR = ['var(--stocked)', 'var(--partial)', 'var(--out)']

const SORT_KEY = 'sous-recipe-sort'

/** The last sort chosen on this device, or the default. */
function savedSort(): RecipeSort {
    try {
        const v = localStorage.getItem(SORT_KEY)
        return isRecipeSort(v) ? v : DEFAULT_RECIPE_SORT
    } catch {
        return DEFAULT_RECIPE_SORT
    }
}

export function RecipesPage() {
    const navigate = useNavigate()
    const { data: recipes, isLoading } = useRecipes()
    const { data: pantry } = usePantry()
    const [query, setQuery] = useState('')
    const [activeFilters, setActiveFilters] = useState<string[]>([])
    const [sort, setSort] = useState<RecipeSort>(savedSort)
    const changeSort = (value: RecipeSort) => {
        setSort(value)
        try {
            localStorage.setItem(SORT_KEY, value)
        } catch {
            /* storage unavailable; the choice still applies until reload */
        }
    }

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const { data: linkData } = useIngredientLinks()
    const links = useMemo(() => linkData ?? [], [linkData])

    const rows = useMemo<RecipeRow[]>(() => {
        return (recipes ?? []).map((recipe) => {
            const { have, need } = recipeAvailability(recipe, pantryItems, links)
            const tags = (recipe.tags ?? []).map((t) => t.name)
            return {
                recipe,
                name: recipe.name,
                have,
                need,
                timesMade: recipe.timesMade ?? 0,
                lastMade: recipe.lastMade,
                dotColor: READINESS_COLOR[readiness({ have, need })],
                tags,
            }
        })
    }, [recipes, pantryItems, links])

    const filterTags = useMemo<string[]>(() => {
        const set = new Set<string>()
        rows.forEach((r) => r.tags.forEach((t) => set.add(t)))
        return [...set].sort((a, b) => a.localeCompare(b))
    }, [rows])

    // Search covers names, ingredients (#40) and notes (#43); `via` says which
    // ingredients matched, or that the notes did.
    const { visible, via } = useMemo(() => {
        const words = searchWords(query)
        const via = new Map<number, string>()
        const matching = rows.filter((r) => {
            if (activeFilters.length && !activeFilters.every((t) => r.tags.includes(t)))
                return false
            const hit = searchRecipe(r.recipe, words, links)
            if (!hit) return false
            const hint = [hit.via.length && `has ${hit.via.join(', ')}`, hit.inNotes && 'in notes']
                .filter(Boolean)
                .join(' · ')
            if (hint) via.set(r.recipe.id, hint)
            return true
        })
        return { visible: sortRecipes(matching, sort), via }
    }, [rows, query, activeFilters, sort, links])

    const toggleFilter = (tag: string) =>
        setActiveFilters((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        )

    return (
        <Screen
            title="recipes"
            action={{ label: 'new recipe', onClick: () => navigate('/recipes/new') }}
        >
            <div className="search-bar">
                <SearchIcon size={22} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="search recipes or ingredients"
                    aria-label="search recipes"
                />
            </div>

            <div className="sort-row">
                <label htmlFor="recipe-sort" className="sort-label">
                    sort
                </label>
                <div className="sort-select-wrap">
                    <select
                        id="recipe-sort"
                        className="sort-select"
                        value={sort}
                        onChange={(e) => {
                            if (isRecipeSort(e.target.value)) changeSort(e.target.value)
                        }}
                    >
                        {RECIPE_SORTS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon size={16} className="sort-chevron" />
                </div>
            </div>

            {filterTags.length > 0 && (
                <div className="chip-rail">
                    {filterTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className={`chip${activeFilters.includes(tag) ? ' active' : ''}`}
                            onClick={() => toggleFilter(tag)}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {visible.length === 0 ? (
                <div className="empty-state">
                    <div className="emoji">🍽️</div>
                    <div className="title">
                        {isLoading
                            ? 'loading…'
                            : rows.length === 0
                              ? 'no recipes yet'
                              : 'no recipes match'}
                    </div>
                    <div>
                        {rows.length === 0
                            ? 'Add a recipe or import one from a link.'
                            : 'Try clearing a filter or your search.'}
                    </div>
                </div>
            ) : (
                <div className="recipe-grid">
                    {visible.map((r) => (
                        <button
                            key={r.recipe.id}
                            type="button"
                            className="recipe-card"
                            onClick={() => navigate(`/recipes/${r.recipe.id}`)}
                        >
                            <span className="status-dot" style={{ background: r.dotColor }} />
                            <span className="name-col">
                                <span className="name">{r.recipe.name}</span>
                                {via.has(r.recipe.id) && (
                                    <span className="search-hint">{via.get(r.recipe.id)}</span>
                                )}
                            </span>
                            {sort === 'popular' && (
                                <span className="meta">
                                    {r.timesMade ? `made ${r.timesMade}×` : 'never made'}
                                </span>
                            )}
                            {sort === 'recent' && (
                                <span className="meta">{madeAgo(r.lastMade)}</span>
                            )}
                            <span className="badge">
                                {r.have} / {r.need}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </Screen>
    )
}
