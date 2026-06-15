import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { SearchBar } from '../components/SearchBar'
import { Pill } from '../components/Pill'
import { RecipeRow } from '../components/RecipeRow'
import { PlusIcon } from '../components/Icons'
import { useRecipes, useRecipeTags, useDeleteRecipe } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { getAvailableIngredients } from '../lib/recipeHelper'
import type { Recipe } from '../lib/types'

export function RecipesListPage() {
  const navigate = useNavigate()
  const recipesQuery = useRecipes()
  const tagsQuery = useRecipeTags()
  const pantryQuery = usePantry()
  const deleteRecipe = useDeleteRecipe()

  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const pantryItems = useMemo(() => pantryQuery.data?.pantryItems ?? [], [pantryQuery.data])

  // Mirrors RecipesViewModel's CombineLatest pipeline: search-contains, tag-OR,
  // then sort by pantry-availability ratio (desc), name as tiebreaker (asc).
  const rows = useMemo(() => {
    const recipes = recipesQuery.data ?? []

    const stats = new Map<number, { available: number; total: number; ratio: number }>()
    const ratioOf = (r: Recipe) => {
      if (!stats.has(r.id)) {
        const total = r.ingredients?.length ?? 0
        const available = getAvailableIngredients(r, pantryItems).length
        stats.set(r.id, { available, total, ratio: total ? available / total : 0 })
      }
      return stats.get(r.id)!
    }

    const filtered = recipes
      .filter((r) => (search.trim() ? r.name.toLowerCase().includes(search.trim().toLowerCase()) : true))
      .filter((r) => {
        if (selectedTags.size === 0) return true
        const names = (r.tags ?? []).map((t) => t.name)
        return names.some((n) => selectedTags.has(n))
      })

    return filtered
      .sort((a, b) => {
        const ra = ratioOf(a).ratio
        const rb = ratioOf(b).ratio
        return ra === rb ? a.name.localeCompare(b.name) : rb - ra
      })
      .map((r) => ({ recipe: r, ...ratioOf(r) }))
  }, [recipesQuery.data, pantryItems, search, selectedTags])

  function toggleTag(name: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const tags = tagsQuery.data ?? []

  return (
    <Screen
      title="recipes"
      loading={recipesQuery.isLoading}
      right={
        <button className="icon-btn" type="button" aria-label="New recipe" onClick={() => navigate('/recipes/new')}>
          <PlusIcon />
        </button>
      }
      search={<SearchBar value={search} onChange={setSearch} placeholder="search recipes" />}
    >
      {tags.length > 0 && (
        <div className="filter-pills">
          {tags.map((tag) => (
            <Pill
              key={tag.id}
              label={tag.name}
              active={selectedTags.has(tag.name)}
              onClick={() => toggleTag(tag.name)}
            />
          ))}
        </div>
      )}

      {recipesQuery.isError && <p className="empty-state">Couldn’t load recipes.</p>}

      {recipesQuery.isSuccess && rows.length === 0 && (
        <p className="empty-state">
          {recipesQuery.data.length === 0
            ? 'You don’t have any recipes yet. Tap + to get started.'
            : 'No recipes match your search.'}
        </p>
      )}

      <div className="recipe-list">
        {rows.map(({ recipe, available, total, ratio }) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            available={available}
            total={total}
            ratio={ratio}
            onOpen={() => navigate(`/recipes/${recipe.id}`)}
            onDelete={() => {
              if (confirm(`Delete “${recipe.name}”?`)) deleteRecipe.mutate(recipe.id)
            }}
          />
        ))}
      </div>
    </Screen>
  )
}
