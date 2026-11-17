import { useMemo, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { CheckIcon, SearchIcon } from './Icons'
import { useRemoveIngredientLink, useSetIngredientLink } from '../hooks/useIngredientLinks'
import { ingredientKey, type PantryMatchedIngredient } from '../lib/recipeHelper'
import type { PantryItem } from '../lib/types'

/**
 * Fix how one ingredient matches the pantry (#39): pick the right pantry item, or
 * "always have, don't track". Saved for the household by ingredient name, so it
 * applies to every recipe with that ingredient.
 */
export function IngredientMatchSheet({
    match,
    line,
    pantryItems,
    onClose,
}: {
    match: PantryMatchedIngredient
    /** The ingredient line as shown (scaled). */
    line: string
    pantryItems: PantryItem[]
    onClose: () => void
}) {
    const setLink = useSetIngredientLink()
    const removeLink = useRemoveIngredientLink()
    const [query, setQuery] = useState('')
    const key = ingredientKey(match.ingredient)
    const busy = setLink.isPending || removeLink.isPending
    const failed = setLink.isError || removeLink.isError

    const current = match.untracked
        ? 'always have (not tracked)'
        : match.pantryItem
          ? `${match.pantryItem.name}${match.link ? ' (your match)' : ' (automatic)'}`
          : 'nothing in your pantry'

    const options = useMemo(() => {
        const q = query.trim().toLowerCase()
        return [...pantryItems]
            .filter((p) => !q || p.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 60)
    }, [pantryItems, query])

    const save = (pantryItemId: number | null) =>
        setLink.mutate({ name: key, pantryItemId }, { onSuccess: onClose })

    return (
        <BottomSheet onClose={onClose} className="match-sheet">
            <div className="sheet-head">
                <span className="sheet-title">match ingredient</span>
            </div>
            <div className="sheet-subtitle">
                <strong>{line}</strong>
                <br />
                matched to: {current}
            </div>
            <p className="match-note">your choice applies to every recipe with “{key}”.</p>

            <div className="search-bar match-search">
                <SearchIcon size={20} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="search your pantry"
                    aria-label="search your pantry"
                />
            </div>

            <div className="match-list" role="listbox" aria-label="pantry items">
                {options.map((p) => {
                    const selected = !match.untracked && match.pantryItem?.id === p.id
                    return (
                        <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={`match-option${selected ? ' selected' : ''}`}
                            disabled={busy}
                            onClick={() => save(p.id)}
                        >
                            <span>{p.name}</span>
                            {selected && <CheckIcon size={18} />}
                        </button>
                    )
                })}
                {options.length === 0 && (
                    <div className="match-empty">no pantry items match “{query}”.</div>
                )}
            </div>

            <div className="match-actions">
                <button
                    type="button"
                    className="sheet-secondary"
                    disabled={busy || match.untracked}
                    onClick={() => save(null)}
                >
                    always have — don’t track
                </button>
                {match.link && (
                    <button
                        type="button"
                        className="sheet-secondary"
                        disabled={busy}
                        onClick={() => removeLink.mutate(match.link!.id, { onSuccess: onClose })}
                    >
                        use automatic matching
                    </button>
                )}
            </div>
            {failed && (
                <p className="form-error" role="alert">
                    couldn’t save. check your connection and try again.
                </p>
            )}
        </BottomSheet>
    )
}
