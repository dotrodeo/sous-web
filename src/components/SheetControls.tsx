import { useState } from 'react'
import { ChevronDownIcon } from './Icons'
import type { ItemCategory } from '../lib/types'

/** iOS-style toggle used across the pantry/list add-edit sheets. */
export function Switch({
    on,
    onChange,
    label,
}: {
    on: boolean
    onChange: (next: boolean) => void
    label?: string
}) {
    return (
        <button
            type="button"
            className="switch-btn"
            aria-label={label}
            aria-pressed={on}
            onClick={() => onChange(!on)}
        >
            <span className={`switch${on ? ' on' : ''}`}>
                <span className="knob" />
            </span>
        </button>
    )
}

interface CategorySelectProps {
    categories: ItemCategory[]
    value: number | null
    onChange: (categoryId: number) => void
    /** Open the menu upward (for sheets anchored near the bottom). */
    dropUp?: boolean
}

/** Category picker — a faux-select button that opens an emoji + name menu. */
export function CategorySelect({ categories, value, onChange, dropUp }: CategorySelectProps) {
    const [open, setOpen] = useState(false)
    const selected = categories.find((c) => c.id === value)
    const label = selected ? `${selected.icon ?? '🍽️'}  ${selected.name}` : 'uncategorized'

    return (
        <div className="cat-select">
            <button type="button" className="cat-select-btn" onClick={() => setOpen((o) => !o)}>
                <span>{label}</span>
                <ChevronDownIcon size={18} style={{ color: 'var(--ink-40)' }} />
            </button>
            {open && (
                <div className={`cat-menu${dropUp ? ' up' : ''}`}>
                    {categories.map((c) => (
                        <button
                            type="button"
                            key={c.id}
                            className={`cat-option${c.id === value ? ' active' : ''}`}
                            onClick={() => {
                                onChange(c.id)
                                setOpen(false)
                            }}
                        >
                            <span className="emoji">{c.icon ?? '🍽️'}</span>
                            {c.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
