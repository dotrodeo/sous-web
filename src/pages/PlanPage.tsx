import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarPlusIcon,
    ChevronRightIcon,
    PlanIcon,
    PlusIcon,
    SearchIcon,
    ShoppingCartIcon,
    XIcon,
} from '../components/Icons'
import { MealSheet } from '../components/MealSheet'
import { PlanShoppingSheet } from '../components/PlanShoppingSheet'
import {
    useAddPlanDay,
    useAddRecipesToPlan,
    usePlan,
    useRemoveRecipeFromPlan,
} from '../hooks/usePlan'
import { useRecipes } from '../hooks/useRecipes'
import {
    useAddMealsToPlan,
    useDeleteMeal,
    useMeals,
    useRemoveMealFromPlan,
} from '../hooks/useMeals'
import { mealAvailability, mealSuggestions, plannedMealIds } from '../lib/meals'
import { usePantry } from '../hooks/usePantry'
import { SaveButton } from '../components/SaveButton'
import { buildPlanShopping } from '../lib/planShopping'
import { useIngredientLinks } from '../hooks/useIngredientLinks'
import { recipeAvailability } from '../lib/recipeHelper'
import type { ItemCategory, Meal, PantryItem, PlanDay, Recipe } from '../lib/types'

// ── Date helpers (plan dates are full ISO8601; we group/label by day key) ──
const dayKey = (date: string | null): string | null => (date ? date.slice(0, 10) : null)

function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Noon UTC so slicing the day back out is timezone-stable. */
const isoFromKey = (key: string): string => `${key}T12:00:00.000Z`

function labelForKey(key: string | null): string {
    if (!key) return 'any time'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(`${key}T00:00:00`)
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
    if (diff === 0) return 'today'
    if (diff === 1) return 'tomorrow'
    if (diff === -1) return 'yesterday'
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function statusColor(have: number, need: number): string {
    if (need <= 0 || have <= 0) return 'var(--out)'
    return have >= need ? 'var(--stocked)' : 'var(--partial)'
}

/** A recipe or a meal (#67) on a plan day. */
interface ScheduleTarget {
    dayId: number
    kind: 'meal' | 'recipe'
    id: number
    name: string
}
interface PickerTarget {
    dayId: number | null
    label: string
}

export function PlanPage() {
    const navigate = useNavigate()
    const { data: plan } = usePlan()
    const { data: recipes } = useRecipes()
    const { data: pantry } = usePantry()
    const addDay = useAddPlanDay()
    const addRecipes = useAddRecipesToPlan()
    const removeRecipe = useRemoveRecipeFromPlan()
    const { data: mealData } = useMeals()
    const addMeals = useAddMealsToPlan()
    const removeMeal = useRemoveMealFromPlan()
    const deleteMeal = useDeleteMeal()
    const [pickerTab, setPickerTab] = useState<'meal' | 'recipe'>('recipe')
    /** The meal sheet: an existing meal (by id, so it shows fresh data) or a new one for a day. */
    const [mealSheet, setMealSheet] = useState<{ mealId: number | null; dayId?: number } | null>(
        null,
    )

    const [picker, setPicker] = useState<PickerTarget | null>(null)
    const [pickerQuery, setPickerQuery] = useState('')
    const [schedule, setSchedule] = useState<ScheduleTarget | null>(null)
    const [draftDate, setDraftDate] = useState('')
    const [addDateOpen, setAddDateOpen] = useState(false)
    const [newDate, setNewDate] = useState('')
    const [pendingRemove, setPendingRemove] = useState<ScheduleTarget | null>(null)
    const [busy, setBusy] = useState(false)
    const [shopOpen, setShopOpen] = useState(false)

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const categories = useMemo<ItemCategory[]>(
        () => [...(pantry?.itemCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [pantry],
    )
    const { data: linkData } = useIngredientLinks()
    const links = useMemo(() => linkData ?? [], [linkData])
    const recipeById = useMemo(() => {
        const m = new Map<number, Recipe>()
        ;(recipes ?? []).forEach((r) => m.set(r.id, r))
        return m
    }, [recipes])

    // Null ("any time") day first, then today-or-future dates ascending.
    const futureDays = useMemo<PlanDay[]>(() => {
        const tk = todayKey()
        return [...(plan?.planDays ?? [])]
            .filter((d) => d.date == null || (dayKey(d.date) ?? '') >= tk)
            .sort((a, b) => {
                const ka = dayKey(a.date)
                const kb = dayKey(b.date)
                if (ka === kb) return 0
                if (ka == null) return -1
                if (kb == null) return 1
                return ka < kb ? -1 : 1
            })
    }, [plan])

    const anyTimeDay = useMemo(() => futureDays.find((d) => d.date == null), [futureDays])

    const shopping = useMemo(
        () => buildPlanShopping(futureDays, recipeById, pantryItems, links),
        [futureDays, recipeById, pantryItems, links],
    )
    const missingCount = shopping.rows.filter((r) => r.status === 'missing').length

    const entryCount = (d: PlanDay) => d.recipes.length + (d.meals?.length ?? 0)
    const totalMeals = futureDays.reduce((n, d) => n + entryCount(d), 0)
    const scheduledMeals = futureDays
        .filter((d) => d.date != null)
        .reduce((n, d) => n + entryCount(d), 0)
    const suggestions = useMemo(
        () => mealSuggestions(mealData ?? [], plannedMealIds(plan?.planDays ?? [])),
        [mealData, plan],
    )
    /** The meal the sheet shows, fresh from the plan or the meal list. */
    const sheetMeal = useMemo<Meal | null>(() => {
        if (mealSheet?.mealId == null) return null
        const id = mealSheet.mealId
        return (
            (plan?.planDays ?? []).flatMap((d) => d.meals ?? []).find((m) => m.id === id) ??
            (mealData ?? []).find((m) => m.id === id) ??
            null
        )
    }, [mealSheet, plan, mealData])
    const summary =
        totalMeals === 0
            ? 'nothing planned yet'
            : `${totalMeals} meal${totalMeals === 1 ? '' : 's'}${scheduledMeals ? ` · ${scheduledMeals} scheduled` : ''}`

    const mealDot = (meal: Meal) => {
        const { have, need } = mealAvailability(meal, pantryItems)
        return need === 0 ? 'var(--out)' : statusColor(have, need)
    }

    const dotColor = (recipe: Recipe) => {
        const full = recipeById.get(recipe.id) ?? recipe
        const { have, need } = recipeAvailability(full, pantryItems, links)
        return statusColor(have, need)
    }

    const openPicker = (dayId: number | null, label: string) => {
        setPickerQuery('')
        setPickerTab('recipe')
        setPicker({ dayId, label })
    }
    const onTopAdd = () => {
        if (anyTimeDay) openPicker(anyTimeDay.id, 'any time')
        else openAddDate()
    }

    const addToTarget = async (recipeId: number) => {
        if (!picker || picker.dayId == null) return
        await addRecipes.mutateAsync({ planDayId: picker.dayId, recipeIds: [recipeId] })
        setPicker(null)
    }
    const addMealToTarget = async (mealId: number) => {
        if (!picker || picker.dayId == null) return
        await addMeals.mutateAsync({ planDayId: picker.dayId, mealIds: [mealId] })
        setPicker(null)
    }
    const newMeal = () => {
        if (!picker || picker.dayId == null) return
        setMealSheet({ mealId: null, dayId: picker.dayId })
        setPicker(null)
    }

    const openAddDate = () => {
        setNewDate(todayKey())
        setAddDateOpen(true)
    }
    const saveNewDate = async () => {
        if (!plan || !newDate) throw new Error('nothing to save')
        return addDay.mutateAsync({ planId: plan.id, date: isoFromKey(newDate) })
    }

    const openSchedule = (target: ScheduleTarget, currentKey: string | null) => {
        setDraftDate(currentKey ?? todayKey())
        setSchedule(target)
    }

    const addEntry = (dayId: number, target: ScheduleTarget) =>
        target.kind === 'recipe'
            ? addRecipes.mutateAsync({ planDayId: dayId, recipeIds: [target.id] })
            : addMeals.mutateAsync({ planDayId: dayId, mealIds: [target.id] })
    const removeEntry = (target: ScheduleTarget) =>
        target.kind === 'recipe'
            ? removeRecipe.mutateAsync({ planDayId: target.dayId, recipeId: target.id })
            : removeMeal.mutateAsync({ planDayId: target.dayId, mealId: target.id })

    /** Move a recipe or meal to a date (creating the day if needed) or to "any time". */
    const moveRecipe = async (target: ScheduleTarget, toKey: string | null) => {
        if (!plan) return
        setBusy(true)
        try {
            let day = futureDays.find((d) => dayKey(d.date) === toKey)
            if (!day && toKey != null) {
                const updated = await addDay.mutateAsync({
                    planId: plan.id,
                    date: isoFromKey(toKey),
                })
                day = updated.planDays.find((d) => dayKey(d.date) === toKey)
            }
            if (!day || day.id === target.dayId) return
            await addEntry(day.id, target)
            await removeEntry(target)
        } finally {
            setBusy(false)
        }
    }

    const confirmRemove = async () => {
        if (!pendingRemove) return
        await removeEntry(pendingRemove)
        setPendingRemove(null)
    }

    const pickerRecipes = useMemo(() => {
        const q = pickerQuery.trim().toLowerCase()
        return (recipes ?? []).filter((r) => !q || r.name.toLowerCase().includes(q))
    }, [recipes, pickerQuery])

    return (
        <>
            <div className="blob">
                <div className="blob-actions">
                    <button
                        type="button"
                        className="fab"
                        aria-label="add to plan"
                        onClick={onTopAdd}
                    >
                        <CalendarPlusIcon size={23} />
                    </button>
                </div>
            </div>

            <div className="content plan">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">plan</h1>
                        <div className="summary">{summary}</div>
                    </div>
                    <button type="button" className="btn-primary" onClick={onTopAdd}>
                        <PlusIcon size={20} />
                        add to plan
                    </button>
                </div>

                <div className="page-head">
                    <h1 className="page-title">plan</h1>
                    <div className="summary">{summary}</div>
                </div>

                {totalMeals > 0 && pantry && (
                    <button
                        type="button"
                        className="btn-pill plan-shop-btn"
                        onClick={() => setShopOpen(true)}
                    >
                        <ShoppingCartIcon size={18} />
                        shop for the plan
                        {missingCount > 0 && (
                            <span className="plan-shop-count">· {missingCount}</span>
                        )}
                    </button>
                )}

                {futureDays.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">🗓️</div>
                        <div className="title">no meals planned</div>
                        <div>Add a date, then drop in a recipe or a meal.</div>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ marginTop: 20 }}
                            onClick={openAddDate}
                        >
                            <CalendarPlusIcon size={20} />
                            add a date
                        </button>
                    </div>
                ) : (
                    <div style={{ marginTop: 4 }}>
                        {futureDays.map((day) => {
                            const key = dayKey(day.date)
                            const entries: (ScheduleTarget & { dot: string; open: () => void })[] =
                                [
                                    ...day.recipes.map((recipe) => ({
                                        dayId: day.id,
                                        kind: 'recipe' as const,
                                        id: recipe.id,
                                        name: recipe.name,
                                        dot: dotColor(recipe),
                                        open: () => navigate(`/recipes/${recipe.id}`),
                                    })),
                                    ...(day.meals ?? []).map((meal) => ({
                                        dayId: day.id,
                                        kind: 'meal' as const,
                                        id: meal.id,
                                        name: meal.name,
                                        dot: mealDot(meal),
                                        open: () => setMealSheet({ mealId: meal.id }),
                                    })),
                                ].sort((a, b) => a.name.localeCompare(b.name))
                            return (
                                <div className="plan-group" key={day.id}>
                                    <div className="plan-group-head">
                                        <div
                                            className={`plan-group-title${key === todayKey() ? ' today' : ''}`}
                                        >
                                            <span className="label">{labelForKey(key)}</span>
                                            <span className="count">{entries.length}</span>
                                        </div>
                                    </div>

                                    {entries.length === 0 ? (
                                        <div className="meal-empty">nothing planned here</div>
                                    ) : (
                                        <div className="meal-list">
                                            {entries.map((entry) => (
                                                <div
                                                    className={`meal-row${entry.kind === 'meal' ? ' is-meal' : ''}`}
                                                    key={`${entry.kind}-${entry.id}`}
                                                >
                                                    <span
                                                        className="status-dot"
                                                        style={{ background: entry.dot }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="name"
                                                        onClick={entry.open}
                                                    >
                                                        {entry.name}
                                                        {entry.kind === 'meal' && (
                                                            <span className="meal-tag">meal</span>
                                                        )}
                                                    </button>
                                                    <div className="meal-actions">
                                                        <button
                                                            type="button"
                                                            className="meal-btn sched"
                                                            aria-label="schedule"
                                                            title="schedule"
                                                            onClick={() => openSchedule(entry, key)}
                                                        >
                                                            <PlanIcon size={21} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="meal-btn remove"
                                                            aria-label="remove from plan"
                                                            title="remove from plan"
                                                            onClick={() => setPendingRemove(entry)}
                                                        >
                                                            <XIcon size={20} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="meal-btn open"
                                                            aria-label={
                                                                entry.kind === 'meal'
                                                                    ? 'open meal'
                                                                    : 'open recipe'
                                                            }
                                                            onClick={entry.open}
                                                        >
                                                            <ChevronRightIcon size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn-dashed plan-add-here"
                                        onClick={() => openPicker(day.id, labelForKey(key))}
                                    >
                                        <PlusIcon size={17} />
                                        add a recipe or meal
                                    </button>
                                </div>
                            )
                        })}

                        <button type="button" className="add-date-link" onClick={openAddDate}>
                            <CalendarPlusIcon size={20} />
                            add a date
                        </button>
                    </div>
                )}
            </div>

            {shopOpen && pantry && (
                <PlanShoppingSheet
                    pantryId={pantry.id}
                    rows={shopping.rows}
                    recipeCount={shopping.recipeCount}
                    onClose={() => setShopOpen(false)}
                />
            )}

            {picker && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setPicker(null)} />
                    <div className="sheet-card picker">
                        <div className="sheet-grabber" />
                        <div className="picker-head">
                            <div>
                                <div className="picker-title">add to plan</div>
                                <div className="picker-target">for {picker.label}</div>
                            </div>
                            <button
                                type="button"
                                className="picker-close"
                                aria-label="close"
                                onClick={() => setPicker(null)}
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="seg picker-tabs" role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={pickerTab === 'recipe'}
                                className={pickerTab === 'recipe' ? 'active' : ''}
                                onClick={() => setPickerTab('recipe')}
                            >
                                a recipe
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={pickerTab === 'meal'}
                                className={pickerTab === 'meal' ? 'active' : ''}
                                onClick={() => setPickerTab('meal')}
                            >
                                a meal
                            </button>
                        </div>
                        {pickerTab === 'recipe' ? (
                            <>
                                <div className="picker-search">
                                    <SearchIcon size={20} />
                                    <input
                                        value={pickerQuery}
                                        onChange={(e) => setPickerQuery(e.target.value)}
                                        placeholder="search recipes"
                                        aria-label="search recipes"
                                    />
                                </div>
                                <div className="picker-list">
                                    {pickerRecipes.length === 0 ? (
                                        <div className="picker-empty">no recipes match</div>
                                    ) : (
                                        pickerRecipes.map((r) => (
                                            <div className="picker-row" key={r.id}>
                                                <span
                                                    className="status-dot"
                                                    style={{ background: dotColor(r) }}
                                                />
                                                <span className="name">{r.name}</span>
                                                <button
                                                    type="button"
                                                    className="add-pill"
                                                    disabled={addRecipes.isPending}
                                                    onClick={() => addToTarget(r.id)}
                                                >
                                                    <PlusIcon size={16} />
                                                    add
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="btn-dashed picker-new-meal"
                                    onClick={newMeal}
                                >
                                    <PlusIcon size={18} />
                                    new meal
                                </button>
                                <div className="picker-hint">
                                    a meal is a name and what you need from the pantry, no recipe.
                                </div>
                                {suggestions.length > 0 && (
                                    <>
                                        <div className="section-label picker-section">
                                            recent meals
                                        </div>
                                        <div className="picker-list">
                                            {suggestions.map((m) => (
                                                <div className="picker-row" key={m.id}>
                                                    <span
                                                        className="status-dot"
                                                        style={{ background: mealDot(m) }}
                                                    />
                                                    <span className="name">
                                                        {m.name}
                                                        <span className="picker-sub">
                                                            {m.items.length} item
                                                            {m.items.length === 1 ? '' : 's'}
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="add-pill"
                                                        disabled={addMeals.isPending}
                                                        onClick={() => addMealToTarget(m.id)}
                                                    >
                                                        <PlusIcon size={16} />
                                                        add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="picker-dismiss"
                                                        aria-label={`don’t suggest ${m.name} again`}
                                                        title="don’t suggest again"
                                                        disabled={deleteMeal.isPending}
                                                        onClick={() => deleteMeal.mutate(m.id)}
                                                    >
                                                        <XIcon size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {mealSheet && pantry && (mealSheet.mealId == null || sheetMeal) && (
                <MealSheet
                    key={mealSheet.mealId ?? 'new'}
                    meal={sheetMeal}
                    pantryId={pantry.id}
                    pantryItems={pantryItems}
                    categories={categories}
                    onClose={() => setMealSheet(null)}
                    onCreated={(meal) =>
                        mealSheet.dayId != null
                            ? addMeals.mutateAsync({
                                  planDayId: mealSheet.dayId,
                                  mealIds: [meal.id],
                              })
                            : undefined
                    }
                />
            )}

            {schedule && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setSchedule(null)} />
                    <div className="sheet-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">select a date</span>
                            <SaveButton
                                onSave={() => moveRecipe(schedule, draftDate || null)}
                                onSaved={() => setSchedule(null)}
                            />
                        </div>
                        <div className="sheet-subtitle">
                            when do you want to make <strong>{schedule.name}</strong>?
                        </div>
                        <input
                            className="field"
                            type="date"
                            value={draftDate}
                            onChange={(e) => setDraftDate(e.target.value)}
                        />
                        {anyTimeDay && (
                            <button
                                type="button"
                                className="sheet-secondary"
                                disabled={busy}
                                onClick={() =>
                                    moveRecipe(schedule, null)
                                        .catch(() => {})
                                        .finally(() => setSchedule(null))
                                }
                            >
                                move to “any time”
                            </button>
                        )}
                    </div>
                </div>
            )}

            {addDateOpen && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setAddDateOpen(false)} />
                    <div className="sheet-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">add a date</span>
                            <SaveButton
                                onSave={saveNewDate}
                                onSaved={() => setAddDateOpen(false)}
                                disabled={!newDate}
                            />
                        </div>
                        <div className="sheet-subtitle">create a new day to plan meals for.</div>
                        <input
                            className="field"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {pendingRemove && (
                <div className="modal-backdrop">
                    <div className="modal-scrim" onClick={() => setPendingRemove(null)} />
                    <div className="modal-card">
                        <div className="modal-badge danger">
                            <XIcon size={26} />
                        </div>
                        <div className="modal-title">remove from plan?</div>
                        <div className="modal-text">
                            <strong>{pendingRemove.name}</strong> will be taken off your meal plan.
                            {pendingRemove.kind === 'meal' &&
                                ' You can add it again from “recent meals”.'}
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                style={{ flex: 1 }}
                                onClick={() => setPendingRemove(null)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={removeRecipe.isPending || removeMeal.isPending}
                                onClick={confirmRemove}
                            >
                                remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
