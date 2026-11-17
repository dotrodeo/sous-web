import { useMemo, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { CheckIcon } from './Icons'
import { SaveButton } from './SaveButton'
import { useAddToShoppingList } from '../hooks/usePantry'
import type { PlanShoppingRow, PlanShoppingStatus } from '../lib/planShopping'

const SECTION: Record<PlanShoppingStatus, string> = {
    missing: 'missing',
    low: 'running low',
    listed: 'already on the list',
}

/**
 * Review sheet for "shop for the plan": what the upcoming recipes need. Missing
 * items start checked, running-low ones unchecked; items already on the list are
 * shown for context. Adds the checked ones in one request.
 */
export function PlanShoppingSheet({
    pantryId,
    rows,
    recipeCount,
    onClose,
}: {
    pantryId: number
    rows: PlanShoppingRow[]
    recipeCount: number
    onClose: () => void
}) {
    const addToList = useAddToShoppingList()
    // Fixed when the sheet opens, so a live update doesn't reshuffle the list mid-review.
    const [shown] = useState(rows)
    const [checked, setChecked] = useState(
        () => new Set(rows.filter((r) => r.status === 'missing').map((r) => r.key)),
    )
    const toggle = (key: string) =>
        setChecked((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const sections = useMemo(
        () =>
            (['missing', 'low', 'listed'] as const)
                .map((status) => ({ status, rows: shown.filter((r) => r.status === status) }))
                .filter((s) => s.rows.length > 0),
        [shown],
    )
    const actionable = shown.some((r) => r.status !== 'listed')
    const count = checked.size

    const save = () => {
        const picked = shown.filter((r) => checked.has(r.key))
        return addToList.mutateAsync({
            pantryId,
            itemIds: picked.filter((r) => r.itemId != null).map((r) => r.itemId!),
            names: picked.filter((r) => r.itemId == null).map((r) => r.name),
        })
    }

    return (
        <BottomSheet onClose={onClose} className="plan-shop">
            <div className="sheet-head">
                <span className="sheet-title">shop for the plan</span>
                <SaveButton
                    onSave={save}
                    onSaved={onClose}
                    disabled={count === 0}
                    label={count ? `add ${count}` : 'add'}
                />
            </div>
            <div className="sheet-subtitle">
                for the <strong>{recipeCount}</strong> recipe{recipeCount === 1 ? '' : 's'} on your
                upcoming plan
            </div>

            {/* The list scrolls; the title and add button stay in view. */}
            <div className="plan-shop-list">
                {!actionable && (
                    <div className="plan-shop-empty">
                        everything the plan needs is in stock
                        {shown.length ? ' or already on the list' : ''}.
                    </div>
                )}

                {sections.map(({ status, rows: sectionRows }) => (
                    <div className="plan-shop-section" key={status}>
                        <div className="plan-shop-label">{SECTION[status]}</div>
                        {sectionRows.map((row) => {
                            const listed = row.status === 'listed'
                            const on = listed || checked.has(row.key)
                            return (
                                <button
                                    key={row.key}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    aria-disabled={listed}
                                    className={`plan-shop-row${listed ? ' listed' : ''}`}
                                    onClick={() => !listed && toggle(row.key)}
                                >
                                    <span className={`check-circle${on ? ' checked' : ''}`}>
                                        <span className="ring">
                                            {on && <CheckIcon size={15} />}
                                        </span>
                                    </span>
                                    <span className="plan-shop-text">
                                        <span className="plan-shop-name">{row.name}</span>
                                        <span className="plan-shop-recipes">
                                            {row.recipes.join(' · ')}
                                        </span>
                                    </span>
                                    {row.itemId == null && (
                                        <span className="plan-shop-new">new</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                ))}
            </div>
        </BottomSheet>
    )
}
