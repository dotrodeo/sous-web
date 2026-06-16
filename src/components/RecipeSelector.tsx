import { useMemo, useState } from 'react'
import { CheckIcon } from './Icons'
import type { Recipe } from '../lib/types'

interface RecipeSelectorProps {
  recipes: Recipe[]
  onClose: () => void
  onSave: (recipeIds: number[]) => void
}

/** RecipeSelector.swift — multi-select list of recipes to add to a plan day. */
export function RecipeSelector({ recipes, onClose, onSave }: RecipeSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    [recipes],
  )

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="item-modal-head">
          <h2 className="section-title">select recipes</h2>
          <button className="text-btn save-btn" type="button" disabled={selected.size === 0} onClick={() => onSave([...selected])}>
            save
          </button>
        </div>

        <div className="selector-list">
          {sorted.map((recipe) => {
            const isSelected = selected.has(recipe.id)
            return (
              <button
                key={recipe.id}
                type="button"
                className={`selector-option${isSelected ? ' selected' : ''}`}
                onClick={() => toggle(recipe.id)}
              >
                <span>{recipe.name}</span>
                {isSelected && <CheckIcon size={18} />}
              </button>
            )
          })}
          {sorted.length === 0 && <p className="empty-state">No recipes to add.</p>}
        </div>
      </div>
    </div>
  )
}
