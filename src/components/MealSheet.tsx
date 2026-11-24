// A planned meal that isn't a recipe (#67): view its items' pantry status, edit its
// name and items, or log it as made. Creating a meal starts in the editor.
import { useMemo, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { SaveButton } from './SaveButton'
import { CategorySelect } from './SheetControls'
import { CheckIcon, EditIcon, ListIcon, PlusIcon, SearchIcon, XIcon } from './Icons'
import { useCompleteMeal, useUpsertMeal } from '../hooks/useMeals'
import { useUpsertPantryItem } from '../hooks/usePantry'
import { mealAvailability, mealItemPantry } from '../lib/meals'
import type { ItemCategory, Meal, PantryItem } from '../lib/types'

type Mode = 'edit' | 'made' | 'view'
type Status = 'add' | 'list' | 'low' | 'stock'

const STATUS_LABEL: Record<Status, string> = {
    stock: 'in your pantry',
    low: 'running low — add to shopping list',
    list: 'on your shopping list',
    add: 'not in your pantry — add to shopping list',
}

function statusOf(item: PantryItem): Status {
    if (item.isInStock && !item.isLow) return 'stock'
    if (item.isInShoppingList) return 'list'
    if (item.isInStock && item.isLow) return 'low'
    return 'add'
}

/** Every word typed appears in the name, ignoring case. */
function matches(name: string, query: string): boolean {
    const n = name.toLowerCase()
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((w) => n.includes(w))
}

interface DraftItem {
    pantryItemId: number
    optional: boolean
}

export function MealSheet({
    meal,
    pantryId,
    pantryItems,
    categories,
    onClose,
    onCreated,
}: {
    /** null: create a new meal. */
    meal: Meal | null
    pantryId: number
    pantryItems: PantryItem[]
    categories: ItemCategory[]
    onClose: () => void
    /** A new meal was saved (the caller puts it on the plan). */
    onCreated?: (meal: Meal) => Promise<unknown> | void
}) {
    const [mode, setMode] = useState<Mode>(meal ? 'view' : 'edit')
    const upsertMeal = useUpsertMeal()
    const upsertItem = useUpsertPantryItem()
    const completeMeal = useCompleteMeal()

    // ── edit ──
    const [name, setName] = useState(meal?.name ?? '')
    const [items, setItems] = useState<DraftItem[]>(
        () =>
            meal?.items.map((i) => ({ pantryItemId: i.pantryItemId, optional: i.optional })) ?? [],
    )
    const [query, setQuery] = useState('')
    const [newCategory, setNewCategory] = useState<number | null>(categories[0]?.id ?? null)
    const byId = useMemo(() => new Map(pantryItems.map((p) => [p.id, p])), [pantryItems])
    const typed = query.trim()
    const added = new Set(items.map((i) => i.pantryItemId))
    const results = typed
        ? pantryItems.filter((p) => !added.has(p.id) && matches(p.name, typed)).slice(0, 6)
        : []
    const canCreate =
        typed.length > 0 &&
        !pantryItems.some((p) => p.name.trim().toLowerCase() === typed.toLowerCase())

    const addItem = (id: number) => {
        setItems((prev) =>
            prev.some((i) => i.pantryItemId === id)
                ? prev
                : [...prev, { pantryItemId: id, optional: false }],
        )
        setQuery('')
    }
    const createItem = async () => {
        const created = await upsertItem.mutateAsync({
            pantryId,
            patch: {
                name: typed,
                isInStock: false,
                ...(newCategory != null ? { categoryId: newCategory } : {}),
            },
        })
        addItem(created.id)
    }
    const save = async () => {
        if (!name.trim()) throw new Error('nothing to save')
        const saved = await upsertMeal.mutateAsync({
            ...(meal ? { id: meal.id } : {}),
            name: name.trim(),
            items,
        })
        if (!meal) await onCreated?.(saved)
        return saved
    }

    // ── made ──
    const [usage, setUsage] = useState<Record<number, 'low' | 'out'>>({})
    const toggleUsage = (id: number, value: 'low' | 'out') =>
        setUsage((u) => {
            const next = { ...u }
            if (next[id] === value) delete next[id]
            else next[id] = value
            return next
        })

    if (mode === 'view' && meal) {
        const { have, need } = mealAvailability(meal, pantryItems)
        const putOnList = (item: PantryItem) =>
            upsertItem.mutate({
                pantryId,
                patch: { id: item.id, name: item.name, isInShoppingList: true },
            })
        return (
            <BottomSheet onClose={onClose} className="meal-sheet">
                <div className="sheet-head">
                    <span className="sheet-title">{meal.name}</span>
                    <button type="button" className="btn-text" onClick={() => setMode('edit')}>
                        <EditIcon size={18} />
                        edit
                    </button>
                </div>
                <div className="sheet-subtitle">
                    {need === 0
                        ? 'no items yet'
                        : `${have} of ${need} item${need === 1 ? '' : 's'} in your pantry`}
                </div>
                <div className="meal-sheet-body">
                    <div className="ingredient-card meal-items">
                        {meal.items.length === 0 && (
                            <div className="ingredient-row">
                                <span className="text" style={{ color: 'var(--ink-40)' }}>
                                    edit the meal to add what it needs
                                </span>
                            </div>
                        )}
                        {meal.items.map((mi) => {
                            const item = mealItemPantry(mi, pantryItems)
                            const status = statusOf(item)
                            const canAdd = status === 'add' || status === 'low'
                            return (
                                <div className="ingredient-row" key={mi.id}>
                                    <span className="text">
                                        {item.name}
                                        {mi.optional && (
                                            <span className="ing-optional">optional</span>
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        className={`ing-status ${status}`}
                                        aria-label={`${item.name}: ${STATUS_LABEL[status]}`}
                                        title={STATUS_LABEL[status]}
                                        disabled={!canAdd}
                                        onClick={() => canAdd && putOnList(item)}
                                    >
                                        {status === 'stock' && <CheckIcon size={18} />}
                                        {status === 'low' && <span className="low-mark">low</span>}
                                        {status === 'list' && <ListIcon size={17} />}
                                        {status === 'add' && <PlusIcon size={18} />}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                    <button
                        type="button"
                        className="btn-primary meal-made-btn"
                        onClick={() => setMode('made')}
                    >
                        <CheckIcon size={20} />I made this
                    </button>
                </div>
            </BottomSheet>
        )
    }

    if (mode === 'made' && meal) {
        const inStock = meal.items
            .map((mi) => mealItemPantry(mi, pantryItems))
            .filter((p) => p.isInStock)
        const marked = Object.keys(usage).length
        const log = async () => {
            await completeMeal.mutateAsync({
                id: meal.id,
                completion: {
                    finishedPantryItems: inStock
                        .filter((p) => usage[p.id] === 'out')
                        .map((p) => p.id),
                    lowPantryItems: inStock.filter((p) => usage[p.id] === 'low').map((p) => p.id),
                },
            })
        }
        return (
            <BottomSheet onClose={onClose} className="meal-sheet">
                <div className="sheet-head">
                    <span className="sheet-title">you made {meal.name}!</span>
                    <SaveButton label="log it" onSave={log} onSaved={onClose} />
                </div>
                <div className="sheet-subtitle">
                    it comes off your plan, and you can plan it again any time.
                </div>
                <div className="meal-sheet-body">
                    {inStock.length > 0 && (
                        <>
                            <div className="finished-head">
                                <div className="section-label">running low or used up?</div>
                                <span className="col-hint">
                                    {marked === 0 ? 'none yet' : `${marked} marked`}
                                </span>
                            </div>
                            <div className="finished-list">
                                {inStock.map((p) => {
                                    const state = usage[p.id]
                                    return (
                                        <div
                                            key={p.id}
                                            className={`finished-row${state ? ` ${state}` : ''}`}
                                        >
                                            <span className="label">{p.name}</span>
                                            <span className="usage-pills">
                                                <button
                                                    type="button"
                                                    className={`usage-pill low${state === 'low' ? ' on' : ''}`}
                                                    aria-pressed={state === 'low'}
                                                    onClick={() => toggleUsage(p.id, 'low')}
                                                >
                                                    low
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`usage-pill out${state === 'out' ? ' on' : ''}`}
                                                    aria-pressed={state === 'out'}
                                                    onClick={() => toggleUsage(p.id, 'out')}
                                                >
                                                    used up
                                                </button>
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                    <button
                        type="button"
                        className="sheet-secondary"
                        onClick={() => setMode('view')}
                    >
                        not yet
                    </button>
                </div>
            </BottomSheet>
        )
    }

    // ── edit / create ──
    return (
        <BottomSheet onClose={onClose} className="meal-sheet">
            <div className="sheet-head">
                <span className="sheet-title">{meal ? 'edit meal' : 'new meal'}</span>
                <SaveButton
                    onSave={save}
                    onSaved={() => (meal ? setMode('view') : onClose())}
                    disabled={!name.trim()}
                />
            </div>
            <div className="meal-sheet-body">
                <label className="field-label" htmlFor="meal-name">
                    meal
                </label>
                <input
                    id="meal-name"
                    className="field"
                    value={name}
                    autoFocus={!meal}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="tacos"
                />

                <div className="field-label meal-items-label">what you need</div>
                {items.length > 0 && (
                    <div className="meal-edit-items">
                        {items.map((i) => {
                            const p = byId.get(i.pantryItemId)
                            const label = p?.name ?? 'item'
                            return (
                                <div className="meal-edit-row" key={i.pantryItemId}>
                                    <span className="name">{label}</span>
                                    <button
                                        type="button"
                                        className={`opt-toggle${i.optional ? ' on' : ''}`}
                                        aria-pressed={i.optional}
                                        aria-label={`optional: ${label}`}
                                        title="optional: doesn't count as missing"
                                        onClick={() =>
                                            setItems((prev) =>
                                                prev.map((x) =>
                                                    x.pantryItemId === i.pantryItemId
                                                        ? { ...x, optional: !x.optional }
                                                        : x,
                                                ),
                                            )
                                        }
                                    >
                                        optional
                                    </button>
                                    <button
                                        type="button"
                                        className="meal-remove"
                                        aria-label={`remove ${label}`}
                                        onClick={() =>
                                            setItems((prev) =>
                                                prev.filter(
                                                    (x) => x.pantryItemId !== i.pantryItemId,
                                                ),
                                            )
                                        }
                                    >
                                        <XIcon size={18} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="search-bar meal-search">
                    <SearchIcon size={20} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && results[0]) {
                                e.preventDefault()
                                addItem(results[0].id)
                            }
                        }}
                        placeholder="add from your pantry"
                        aria-label="add from your pantry"
                    />
                </div>
                {results.length > 0 && (
                    <div className="meal-results">
                        {results.map((p) => (
                            <button
                                type="button"
                                key={p.id}
                                className="meal-result"
                                onClick={() => addItem(p.id)}
                            >
                                <PlusIcon size={16} />
                                {p.name}
                            </button>
                        ))}
                    </div>
                )}
                {canCreate && (
                    <div className="meal-create">
                        <div className="meal-create-text">
                            “<strong>{typed}</strong>” isn’t in your pantry yet. add it to:
                        </div>
                        <div className="meal-create-row">
                            <CategorySelect
                                categories={categories}
                                value={newCategory}
                                onChange={setNewCategory}
                            />
                            <button
                                type="button"
                                className="btn-primary meal-create-btn"
                                disabled={upsertItem.isPending}
                                onClick={() => {
                                    createItem().catch(() => {})
                                }}
                            >
                                <PlusIcon size={18} />
                                add
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </BottomSheet>
    )
}
