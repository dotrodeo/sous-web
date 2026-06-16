import { useState } from 'react'
import { RepeatIcon } from './Icons'
import type { ItemCategory, PantryItem, PantryItemPatch } from '../lib/types'

interface PantryItemModalProps {
    /** The item being edited, or null to create a new one. */
    item: PantryItem | null
    categories: ItemCategory[]
    onClose: () => void
    onSave: (patch: PantryItemPatch) => void
}

/** PantryItemModal.swift — name + favorite, category, in-stock, shopping-list. */
export function PantryItemModal({ item, categories, onClose, onSave }: PantryItemModalProps) {
    const [name, setName] = useState(item?.name ?? '')
    const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false)
    const [isInStock, setIsInStock] = useState(item?.isInStock ?? false)
    const [isInShoppingList, setIsInShoppingList] = useState(item?.isInShoppingList ?? false)
    const [categoryId, setCategoryId] = useState<number | undefined>(
        item?.categoryId ?? categories[0]?.id,
    )

    function save() {
        onSave({
            id: item?.id,
            name: name.trim(),
            isFavorite,
            isInStock,
            isInShoppingList,
            categoryId,
        })
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal item-modal" onClick={(e) => e.stopPropagation()}>
                <div className="item-modal-head">
                    <h2 className="section-title">{item ? 'edit item' : 'new item'}</h2>
                    <button
                        className="text-btn save-btn"
                        type="button"
                        disabled={!name.trim()}
                        onClick={save}
                    >
                        save
                    </button>
                </div>

                <div className="item-modal-name">
                    <label className="field" style={{ flex: 1 }}>
                        <span className="field-label">name</span>
                        <input
                            className="field-input"
                            value={name}
                            placeholder="all-purpose flour"
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <button
                        className="fav-toggle"
                        type="button"
                        aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
                        style={{
                            color: isFavorite
                                ? 'var(--p-primary)'
                                : 'color-mix(in srgb, var(--p-foreground) 30%, transparent)',
                        }}
                        onClick={() => setIsFavorite((f) => !f)}
                    >
                        <RepeatIcon size={20} />
                    </button>
                </div>

                <label className="field">
                    <span className="field-label">category</span>
                    <select
                        className="field-input"
                        value={categoryId ?? ''}
                        onChange={(e) =>
                            setCategoryId(e.target.value ? Number(e.target.value) : undefined)
                        }
                    >
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.icon ? `${c.icon} ` : ''}
                                {c.name.toLowerCase()}
                            </option>
                        ))}
                    </select>
                </label>

                <ToggleRow label="in stock" checked={isInStock} onChange={setIsInStock} />
                <ToggleRow
                    label="in shopping list"
                    checked={isInShoppingList}
                    onChange={setIsInShoppingList}
                />
            </div>
        </div>
    )
}

function ToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <label className="toggle-row">
            <span>{label}</span>
            <input
                type="checkbox"
                className="switch"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </label>
    )
}
