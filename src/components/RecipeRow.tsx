import type { Recipe } from '../lib/types'
import { TrashIcon } from './Icons'

/** Status-dot color by pantry-availability ratio (RecipeRow.swift thresholds). */
function ratioColor(ratio: number): string {
  if (ratio < 0.5) return 'var(--p-indeterminate)'
  if (ratio < 0.9) return 'var(--p-warning)'
  return 'var(--p-success)'
}

interface RecipeRowProps {
  recipe: Recipe
  available: number
  total: number
  ratio: number
  onOpen: () => void
  onDelete: () => void
}

/**
 * Recipe list row: status dot + name + "available / total" ratio pill.
 * The native app swipes-to-delete; on web we expose a trash button instead.
 */
export function RecipeRow({ recipe, available, total, ratio, onOpen, onDelete }: RecipeRowProps) {
  return (
    <div className="recipe-row list-item list-item-tappable" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <span className="status-dot" style={{ background: ratioColor(ratio) }} />
      <span className="recipe-row-name">{recipe.name}</span>
      <span className="recipe-row-right">
        <span className="ratio-pill">
          {available} / {total}
        </span>
        <button
          className="row-delete"
          type="button"
          aria-label={`Delete ${recipe.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <TrashIcon size={16} />
        </button>
      </span>
    </div>
  )
}
