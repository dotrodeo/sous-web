import { useState } from 'react'
import { ThumbsUpIcon, ThumbsDownIcon, RepeatIcon } from './Icons'
import type { PantryMatchedIngredient } from '../lib/recipeHelper'
import type { Rating, Recipe, RecipeCompletion } from '../lib/types'

interface IMadeThisModalProps {
  recipe: Recipe
  matched: PantryMatchedIngredient[]
  onClose: () => void
  onSave: (completion: RecipeCompletion) => void
}

/** IMadeThisModal.swift — rating + "ran out of anything?" pantry checklist. */
export function IMadeThisModal({ recipe, matched, onClose, onSave }: IMadeThisModalProps) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [finished, setFinished] = useState<Set<number>>(new Set())

  // Only items matched to the pantry can be marked as run-out.
  const items = matched.filter((m) => m.pantryItem != null)

  function toggleRating(value: Rating) {
    setRating((prev) => (prev === value ? null : value))
  }

  function toggleItem(itemId: number) {
    setFinished((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function done() {
    onSave({
      recipeId: recipe.id,
      rating,
      finishedPantryItems: [...finished],
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal made-modal" onClick={(e) => e.stopPropagation()}>
        <div className="made-head">
          <h2 className="made-title">nice job 😎</h2>
          <button className="made-done" type="button" onClick={done}>
            done
          </button>
        </div>

        <p className="made-stats">
          you’ve made this recipe <strong>{recipe.timesMade + 1}</strong>{' '}
          {recipe.timesMade + 1 === 1 ? 'time' : 'times'}!
        </p>

        <div className="made-section">
          <p className="made-label">what did you think?</p>
          <div className="made-ratings">
            <button
              className={`rating-btn${rating === 1 ? ' active' : ''}`}
              type="button"
              onClick={() => toggleRating(1)}
              aria-label="Thumbs up"
            >
              <ThumbsUpIcon size={28} />
            </button>
            <button
              className={`rating-btn${rating === -1 ? ' active' : ''}`}
              type="button"
              onClick={() => toggleRating(-1)}
              aria-label="Thumbs down"
            >
              <ThumbsDownIcon size={28} />
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="made-section">
            <p className="made-label">did you run out of anything?</p>
            <div className="made-items">
              {items.map((m) => {
                const item = m.pantryItem!
                return (
                  <label key={m.id} className="made-item">
                    <input
                      type="checkbox"
                      checked={finished.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span>{item.name}</span>
                    {item.isFavorite && (
                      <span className="made-fav" title="Favorite">
                        <RepeatIcon size={16} />
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
