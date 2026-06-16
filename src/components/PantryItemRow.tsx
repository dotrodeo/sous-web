import {
  CartIcon,
  StarIcon,
  RepeatIcon,
  OutOfStockIcon,
  TrashIcon,
  ExpiringIcon,
} from './Icons'
import { isWithinThreeDaysOrPast } from '../lib/dateHelper'
import type { PantryItem } from '../lib/types'

interface PantryItemRowProps {
  item: PantryItem
  onTap: () => void
  onToggleFavorite: () => void
  onMarkOutOfStock: () => void
  onDelete: () => void
}

/** Left status indicator (PantryItemRow.swift statusDot). */
function StatusDot({ item }: { item: PantryItem }) {
  if (!item.isInStock && item.isInShoppingList) {
    return <CartIcon size={16} className="pantry-status-cart" />
  }
  const color = item.isInStock ? 'var(--p-success)' : 'var(--p-indeterminate)'
  if (item.isFavorite) {
    return <StarIcon size={16} fill={color} color={color} />
  }
  return <span className="status-dot" style={{ background: color }} />
}

export function PantryItemRow({ item, onTap, onToggleFavorite, onMarkOutOfStock, onDelete }: PantryItemRowProps) {
  const isExpiring = item.isInStock && item.expiresAt != null && isWithinThreeDaysOrPast(item.expiresAt)

  return (
    <div className="pantry-row list-item list-item-tappable" role="button" tabIndex={0} onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
    >
      <span className="pantry-row-status">
        <StatusDot item={item} />
      </span>
      <span className="pantry-row-name">{item.name}</span>
      <span className="pantry-row-actions" onClick={(e) => e.stopPropagation()}>
        {isExpiring && <ExpiringIcon size={18} className="pantry-expiring" aria-label="Expiring soon" />}
        <button
          className="pantry-action"
          type="button"
          aria-label={item.isFavorite ? 'Unfavorite' : 'Favorite'}
          style={{ color: item.isFavorite ? 'var(--p-primary)' : 'var(--p-indeterminate)' }}
          onClick={onToggleFavorite}
        >
          <RepeatIcon size={18} />
        </button>
        <button className="pantry-action" type="button" aria-label="Mark out of stock" onClick={onMarkOutOfStock}>
          <OutOfStockIcon size={18} />
        </button>
        <button className="pantry-action pantry-action-danger" type="button" aria-label="Delete" onClick={onDelete}>
          <TrashIcon size={18} />
        </button>
      </span>
    </div>
  )
}
