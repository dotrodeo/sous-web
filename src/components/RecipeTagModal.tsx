import { useMemo, useState } from 'react'
import { PlusIcon } from './Icons'
import { useRecipeTags } from '../hooks/useRecipes'
import type { RecipeTagPatch } from '../lib/types'

interface RecipeTagModalProps {
  /** Tag names already on the recipe (excluded from the list). */
  addedNames: string[]
  onAdd: (patch: RecipeTagPatch) => void
  onClose: () => void
}

/** RecipeTagModal.swift — pick an existing tag or create one from the query. */
export function RecipeTagModal({ addedNames, onAdd, onClose }: RecipeTagModalProps) {
  const tagsQuery = useRecipeTags()
  const [query, setQuery] = useState('')

  const candidates = useMemo(() => {
    const added = new Set(addedNames.map((n) => n.toLowerCase()))
    return (tagsQuery.data ?? [])
      .filter((t) => !added.has(t.name.toLowerCase()))
      .filter((t) => (query.trim() ? t.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
  }, [tagsQuery.data, addedNames, query])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal tag-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tag-list">
          {candidates.map((tag) => (
            <button key={tag.id} className="tag-option" type="button" onClick={() => onAdd({ id: tag.id, name: tag.name })}>
              {tag.name}
            </button>
          ))}
          {candidates.length === 0 && <p className="empty-state">No matching tags.</p>}
        </div>

        <div className="tag-create">
          <input
            className="search-input"
            value={query}
            placeholder="new tag"
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="icon-btn"
            type="button"
            disabled={!query.trim()}
            aria-label="Create tag"
            onClick={() => query.trim() && onAdd({ name: query.trim() })}
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
