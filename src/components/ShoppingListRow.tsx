import { RepeatIcon, PlusIcon, CheckIcon, PencilIcon, TrashIcon } from './Icons'
import type { PantryItem } from '../lib/types'

interface ShoppingListRowProps {
  item: PantryItem
  showAll: boolean
  onPurchase: () => void
  onAddToList: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Right-side indicator mirroring ShoppingListRow.swift. */
function Indicator({ item, showAll, canBeAdded }: { item: PantryItem; showAll: boolean; canBeAdded: boolean }) {
  if (!showAll) {
    const color = item.isFavorite ? 'var(--p-primary)' : 'var(--p-indeterminate)'
    return <RepeatIcon size={18} style={{ color }} />
  }
  if (canBeAdded) return <PlusIcon size={18} style={{ color: 'var(--p-primary)' }} />
  return <CheckIcon size={18} style={{ color: 'var(--p-indeterminate)' }} />
}

export function ShoppingListRow({ item, showAll, onPurchase, onAddToList, onEdit, onDelete }: ShoppingListRowProps) {
  const canBeAdded = showAll && !item.isInShoppingList

  // Tapping the row purchases the item, or adds it to the list in add mode.
  const primaryAction = canBeAdded ? onAddToList : onPurchase

  return (
    <div className="pantry-row list-item list-item-tappable" role="button" tabIndex={0} onClick={primaryAction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          primaryAction()
        }
      }}
    >
      <span className={`pantry-row-name${canBeAdded ? ' list-row-dim' : ''}`}>{item.name}</span>
      <span className="pantry-row-actions" onClick={(e) => e.stopPropagation()}>
        <span className="shopping-indicator" aria-hidden>
          <Indicator item={item} showAll={showAll} canBeAdded={canBeAdded} />
        </span>
        <button className="pantry-action" type="button" aria-label="Edit" onClick={onEdit}>
          <PencilIcon size={18} />
        </button>
        <button className="pantry-action pantry-action-danger" type="button" aria-label="Delete" onClick={onDelete}>
          <TrashIcon size={18} />
        </button>
      </span>
    </div>
  )
}
