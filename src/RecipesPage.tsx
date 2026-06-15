import { useUser, useActiveHousehold } from './hooks/useUser'
import { useRecipes } from './hooks/useRecipes'
import type { Recipe } from './lib/types'

function ingredientCount(r: Recipe): number {
  return r.ingredients?.length ?? 0
}

function timeSummary(r: Recipe): string {
  const parts: string[] = []
  if (r.prepTime) parts.push(`prep ${r.prepTime}`)
  if (r.cookTime) parts.push(`cook ${r.cookTime}`)
  return parts.join(' · ')
}

export function RecipesPage() {
  const userQuery = useUser()
  const household = useActiveHousehold()
  const recipesQuery = useRecipes()

  if (userQuery.isLoading) return <p className="status">Loading account…</p>
  if (userQuery.isError)
    return <p className="status error">Couldn’t load your account: {String(userQuery.error)}</p>
  if (!household)
    return <p className="status">No household found for this account.</p>

  const recipes = recipesQuery.data ?? []

  return (
    <main className="page">
      <div className="page-head">
        <h2>Recipes</h2>
        <span className="household">{household.name}</span>
      </div>

      {recipesQuery.isLoading && <p className="status">Loading recipes…</p>}
      {recipesQuery.isError && (
        <p className="status error">Couldn’t load recipes: {String(recipesQuery.error)}</p>
      )}
      {recipesQuery.isSuccess && recipes.length === 0 && (
        <p className="status">No recipes yet.</p>
      )}

      <ul className="recipe-list">
        {recipes.map((r) => (
          <li key={r.id} className="recipe-row">
            <div className="recipe-main">
              <span className="recipe-name">{r.name}</span>
              {timeSummary(r) && <span className="recipe-time">{timeSummary(r)}</span>}
            </div>
            <div className="recipe-meta">
              <span className="badge">{ingredientCount(r)} ingredients</span>
              {(r.tags ?? []).map((t) => (
                <span key={t.id} className="pill">
                  {t.name}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
