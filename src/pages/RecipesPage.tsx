import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { SearchIcon } from '../components/Icons'
import { useRecipes } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { getAvailableIngredients } from '../lib/recipeHelper'
import type { PantryItem, Recipe } from '../lib/types'

interface RecipeRow {
    recipe: Recipe
    have: number
    need: number
    dotColor: string
    tags: string[]
}

function statusColor(have: number, need: number): string {
    if (need <= 0 || have <= 0) return 'var(--out)'
    return have >= need ? 'var(--stocked)' : 'var(--partial)'
}

export function RecipesPage() {
    const navigate = useNavigate()
    const { data: recipes, isLoading } = useRecipes()
    const { data: pantry } = usePantry()
    const [query, setQuery] = useState('')
    const [activeFilters, setActiveFilters] = useState<string[]>([])

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])

    const rows = useMemo<RecipeRow[]>(() => {
        return (recipes ?? []).map((recipe) => {
            const need = recipe.ingredients?.length ?? 0
            const have = getAvailableIngredients(recipe, pantryItems).length
            const tags = (recipe.tags ?? []).map((t) => t.name)
            return { recipe, have, need, dotColor: statusColor(have, need), tags }
        })
    }, [recipes, pantryItems])

    const filterTags = useMemo<string[]>(() => {
        const set = new Set<string>()
        rows.forEach((r) => r.tags.forEach((t) => set.add(t)))
        return [...set].sort((a, b) => a.localeCompare(b))
    }, [rows])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return rows.filter((r) => {
            if (q && !r.recipe.name.toLowerCase().includes(q)) return false
            if (activeFilters.length && !activeFilters.every((t) => r.tags.includes(t)))
                return false
            return true
        })
    }, [rows, query, activeFilters])

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
                    placeholder="search recipes"
                    aria-label="search recipes"
                />
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
                            <span className="name">{r.recipe.name}</span>
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
