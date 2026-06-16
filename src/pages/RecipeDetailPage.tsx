import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ChevronLeftIcon, MoreIcon, PlusIcon, CheckIcon, ShoppingCartIcon } from '../components/Icons'
import { IMadeThisModal } from '../components/IMadeThisModal'
import { useRecipe, useDeleteRecipe, useCompleteRecipe } from '../hooks/useRecipes'
import { usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { matchIngredientsToPantry, type PantryMatchedIngredient } from '../lib/recipeHelper'
import type { RecipeCompletion } from '../lib/types'

/** Icon + color for an ingredient's pantry state (DetailView getLeftAdornment). */
function adornment(match: PantryMatchedIngredient) {
  const item = match.pantryItem
  if (!item) return { Icon: PlusIcon, className: 'ing-add' }
  if (item.isInStock) return { Icon: CheckIcon, className: 'ing-stock' }
  if (item.isInShoppingList) return { Icon: ShoppingCartIcon, className: 'ing-list' }
  return { Icon: PlusIcon, className: 'ing-add' }
}

export function RecipeDetailPage() {
  const { id } = useParams()
  const recipeId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const recipeQuery = useRecipe(recipeId)
  const pantryQuery = usePantry()
  const deleteRecipe = useDeleteRecipe()
  const completeRecipe = useCompleteRecipe()
  const upsertItem = useUpsertPantryItem()

  const [menuOpen, setMenuOpen] = useState(false)
  const [madeOpen, setMadeOpen] = useState(false)

  const recipe = recipeQuery.data
  const pantryItems = useMemo(() => pantryQuery.data?.pantryItems ?? [], [pantryQuery.data])
  const pantryId = pantryQuery.data?.id

  const matched = useMemo(
    () => (recipe ? matchIngredientsToPantry(recipe, pantryItems) : []),
    [recipe, pantryItems],
  )

  function addToList(match: PantryMatchedIngredient) {
    if (pantryId == null) return
    const item = match.pantryItem
    if (!item) {
      // Not in pantry: create it on the shopping list.
      upsertItem.mutate({ pantryId, patch: { name: match.ingredient.item ?? match.ingredient.sentence, isInShoppingList: true } })
    } else if (!item.isInShoppingList && !item.isInStock) {
      // `name` is required on every pantry write (see PantryPage).
      upsertItem.mutate({ pantryId, patch: { id: item.id, name: item.name, isInShoppingList: true } })
    }
  }

  function handleComplete(completion: RecipeCompletion) {
    if (recipeId == null) return
    completeRecipe.mutate({ recipeId, completion })
    setMadeOpen(false)
  }

  const title = recipe?.name ?? '…'

  return (
    <Screen
      title={title}
      loading={recipeQuery.isLoading}
      right={
        <div className="detail-actions">
          <button className="icon-btn" type="button" aria-label="Back" onClick={() => navigate('/recipes')}>
            <ChevronLeftIcon />
          </button>
          <div className="menu-wrap">
            <button className="icon-btn" type="button" aria-label="Actions" onClick={() => setMenuOpen((o) => !o)}>
              <MoreIcon />
            </button>
            {menuOpen && recipe && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="menu">
                  <button onClick={() => navigate(`/recipes/${recipe.id}/cook`)}>Let’s cook</button>
                  <button onClick={() => { setMenuOpen(false); setMadeOpen(true) }}>I made this</button>
                  <button onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>Edit recipe</button>
                  <button
                    className="menu-danger"
                    onClick={() => {
                      if (confirm(`Delete “${recipe.name}”?`)) {
                        deleteRecipe.mutate(recipe.id)
                        navigate('/recipes')
                      }
                    }}
                  >
                    Delete recipe
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      }
    >
      {recipe && (
        <div className="detail">
          {(recipe.prepTime || recipe.cookTime || recipe.servings) && (
            <div className="detail-times">
              {recipe.prepTime && <Stat label="prep time" value={recipe.prepTime} />}
              {recipe.cookTime && <Stat label="cook time" value={recipe.cookTime} />}
              {recipe.servings && <Stat label="servings" value={recipe.servings} />}
            </div>
          )}

          <section className="detail-section">
            <h2 className="section-title">ingredients</h2>
            <div className="ingredient-list">
              {matched.map((m) => {
                const a = adornment(m)
                return (
                  <div key={m.id} className="ingredient-row">
                    <span className="ingredient-text">{m.ingredient.sentence}</span>
                    <button
                      className={`ingredient-adorn ${a.className}`}
                      type="button"
                      aria-label="Add to shopping list"
                      onClick={() => addToList(m)}
                    >
                      <a.Icon size={16} />
                    </button>
                  </div>
                )
              })}
              {matched.length === 0 && <p className="empty-state">No ingredients listed.</p>}
            </div>
          </section>

          <section className="detail-section">
            <h2 className="section-title">instructions</h2>
            <ol className="instruction-list">
              {(recipe.instructions ?? []).map((step, i) => (
                <li key={i} className="instruction-row">
                  <span className="instruction-num">{i + 1}</span>
                  <span className="instruction-text">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {madeOpen && recipe && (
        <IMadeThisModal
          recipe={recipe}
          matched={matched}
          onClose={() => setMadeOpen(false)}
          onSave={handleComplete}
        />
      )}
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
