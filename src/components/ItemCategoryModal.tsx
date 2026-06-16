import { useState } from 'react'
import type { ItemCategory, ItemCategoryPatch } from '../lib/types'

interface ItemCategoryModalProps {
  category: ItemCategory | null
  onClose: () => void
  onSave: (patch: ItemCategoryPatch) => void
}

/** ItemCategoryModal.swift — name + emoji icon + non-food toggle. */
export function ItemCategoryModal({ category, onClose, onSave }: ItemCategoryModalProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '❓')
  const [isNonFood, setIsNonFood] = useState(category?.isNonFood ?? false)

  function save() {
    onSave({
      id: category?.id,
      name: name.trim(),
      icon: icon.trim() || undefined,
      isNonFood,
      pantryId: category?.pantryId,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="item-modal-head">
          <h2 className="section-title">{category ? 'edit category' : 'new category'}</h2>
          <button className="text-btn save-btn" type="button" disabled={!name.trim()} onClick={save}>
            save
          </button>
        </div>

        <div className="item-modal-name">
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">name</span>
            <input className="field-input" value={name} placeholder="canned goods" onChange={(e) => setName(e.target.value)} />
          </label>
          {/* Native uses a full emoji picker; here, type or paste an emoji. */}
          <input
            className="emoji-input"
            value={icon}
            aria-label="Category icon"
            onChange={(e) => setIcon(e.target.value)}
          />
        </div>

        <label className="toggle-row">
          <span>non-food category</span>
          <input type="checkbox" className="switch" checked={isNonFood} onChange={(e) => setIsNonFood(e.target.checked)} />
        </label>
      </div>
    </div>
  )
}
