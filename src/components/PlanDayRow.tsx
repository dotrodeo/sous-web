import { ChevronRightIcon, CloseIcon, MadeIcon } from './Icons'
import type { Recipe } from '../lib/types'

/** Status-dot color by pantry-availability ratio (PlanDayRow.swift). */
function ratioColor(ratio: number): string {
  if (ratio > 0.9) return 'var(--p-success)'
  if (ratio > 0.5) return 'var(--p-warning)'
  return 'var(--p-indeterminate)'
}

interface PlanDayRowProps {
  recipe: Recipe
  ratio: number
  onTap: () => void
  onUnplan: () => void
  onCompletion: () => void
}

export function PlanDayRow({ recipe, ratio, onTap, onUnplan, onCompletion }: PlanDayRowProps) {
  return (
    <div className="pantry-row list-item list-item-tappable" role="button" tabIndex={0} onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
    >
      <span className="status-dot" style={{ background: ratioColor(ratio) }} />
      <span className="pantry-row-name">{recipe.name}</span>
      <span className="pantry-row-actions" onClick={(e) => e.stopPropagation()}>
        <button className="pantry-action" type="button" aria-label="I made this" style={{ color: 'var(--p-primary)' }} onClick={onCompletion}>
          <MadeIcon size={18} />
        </button>
        <button className="pantry-action pantry-action-danger" type="button" aria-label="Unplan" onClick={onUnplan}>
          <CloseIcon size={18} />
        </button>
        <span className="plan-chevron" aria-hidden>
          <ChevronRightIcon size={18} />
        </span>
      </span>
    </div>
  )
}
