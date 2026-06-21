import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarPlusIcon,
    ChevronRightIcon,
    PlanIcon,
    PlusIcon,
    SearchIcon,
    XIcon,
} from '../components/Icons'
import {
    useAddPlanDay,
    useAddRecipesToPlan,
    usePlan,
    useRemoveRecipeFromPlan,
} from '../hooks/usePlan'
import { useRecipes } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { getAvailableIngredients } from '../lib/recipeHelper'
import type { PantryItem, PlanDay, Recipe } from '../lib/types'

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

interface ScheduleTarget {
    dayId: number
    recipe: Recipe
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

    const [picker, setPicker] = useState<PickerTarget | null>(null)
    const [pickerQuery, setPickerQuery] = useState('')
    const [schedule, setSchedule] = useState<ScheduleTarget | null>(null)
    const [draftDate, setDraftDate] = useState('')
    const [addDateOpen, setAddDateOpen] = useState(false)
    const [newDate, setNewDate] = useState('')
    const [pendingRemove, setPendingRemove] = useState<ScheduleTarget | null>(null)
    const [busy, setBusy] = useState(false)

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
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

    const totalMeals = futureDays.reduce((n, d) => n + d.recipes.length, 0)
    const scheduledMeals = futureDays
        .filter((d) => d.date != null)
        .reduce((n, d) => n + d.recipes.length, 0)
    const summary =
        totalMeals === 0
            ? 'nothing planned yet'
            : `${totalMeals} meal${totalMeals === 1 ? '' : 's'}${scheduledMeals ? ` · ${scheduledMeals} scheduled` : ''}`

    const dotColor = (recipe: Recipe) => {
        const full = recipeById.get(recipe.id) ?? recipe
        const need = full.ingredients?.length ?? 0
        const have = getAvailableIngredients(full, pantryItems).length
        return statusColor(have, need)
    }

    const openPicker = (dayId: number | null, label: string) => {
        setPickerQuery('')
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

    const openAddDate = () => {
        setNewDate(todayKey())
        setAddDateOpen(true)
    }
    const saveNewDate = async () => {
        if (!plan || !newDate) return
        await addDay.mutateAsync({ planId: plan.id, date: isoFromKey(newDate) })
        setAddDateOpen(false)
    }

    const openSchedule = (dayId: number, recipe: Recipe, currentKey: string | null) => {
        setDraftDate(currentKey ?? todayKey())
        setSchedule({ dayId, recipe })
    }

    /** Move a recipe to a date (creating the day if needed) or to "any time". */
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
            await addRecipes.mutateAsync({ planDayId: day.id, recipeIds: [target.recipe.id] })
            await removeRecipe.mutateAsync({
                planDayId: target.dayId,
                recipeId: target.recipe.id,
            })
        } finally {
            setBusy(false)
            setSchedule(null)
        }
    }

    const confirmRemove = async () => {
        if (!pendingRemove) return
        await removeRecipe.mutateAsync({
            planDayId: pendingRemove.dayId,
            recipeId: pendingRemove.recipe.id,
        })
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
                        aria-label="add a recipe"
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
                        add a recipe
                    </button>
                </div>

                <div className="page-head">
                    <h1 className="page-title">plan</h1>
                    <div className="summary">{summary}</div>
                </div>

                {futureDays.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">🗓️</div>
                        <div className="title">no meals planned</div>
                        <div>Add a date, then drop in a recipe.</div>
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
                            const meals = [...day.recipes].sort((a, b) =>
                                a.name.localeCompare(b.name),
                            )
                            return (
                                <div className="plan-group" key={day.id}>
                                    <div className="plan-group-head">
                                        <div
                                            className={`plan-group-title${key === todayKey() ? ' today' : ''}`}
                                        >
                                            <span className="label">{labelForKey(key)}</span>
                                            <span className="count">{meals.length}</span>
                                        </div>
                                    </div>

                                    {meals.length === 0 ? (
                                        <div className="meal-empty">nothing planned here</div>
                                    ) : (
                                        <div className="meal-list">
                                            {meals.map((recipe) => (
                                                <div className="meal-row" key={recipe.id}>
                                                    <span
                                                        className="status-dot"
                                                        style={{ background: dotColor(recipe) }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="name"
                                                        onClick={() =>
                                                            navigate(`/recipes/${recipe.id}`)
                                                        }
                                                    >
                                                        {recipe.name}
                                                    </button>
                                                    <div className="meal-actions">
                                                        <button
                                                            type="button"
                                                            className="meal-btn sched"
                                                            aria-label="schedule"
                                                            title="schedule"
                                                            onClick={() =>
                                                                openSchedule(day.id, recipe, key)
                                                            }
                                                        >
                                                            <PlanIcon size={21} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="meal-btn remove"
                                                            aria-label="remove from plan"
                                                            title="remove from plan"
                                                            onClick={() =>
                                                                setPendingRemove({
                                                                    dayId: day.id,
                                                                    recipe,
                                                                })
                                                            }
                                                        >
                                                            <XIcon size={20} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="meal-btn open"
                                                            aria-label="open recipe"
                                                            onClick={() =>
                                                                navigate(`/recipes/${recipe.id}`)
                                                            }
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
                                        add a recipe
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

            {picker && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setPicker(null)} />
                    <div className="sheet-card picker">
                        <div className="sheet-grabber" />
                        <div className="picker-head">
                            <div>
                                <div className="picker-title">add a recipe</div>
                                <div className="picker-target">add to {picker.label}</div>
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
                    </div>
                </div>
            )}

            {schedule && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setSchedule(null)} />
                    <div className="sheet-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">select a date</span>
                            <button
                                type="button"
                                className="sheet-save"
                                disabled={busy}
                                onClick={() => moveRecipe(schedule, draftDate || null)}
                            >
                                save
                            </button>
                        </div>
                        <div className="sheet-subtitle">
                            when do you want to make <strong>{schedule.recipe.name}</strong>?
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
                                onClick={() => moveRecipe(schedule, null)}
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
                            <button
                                type="button"
                                className="sheet-save"
                                disabled={!newDate || addDay.isPending}
                                onClick={saveNewDate}
                            >
                                save
                            </button>
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
                            <strong>{pendingRemove.recipe.name}</strong> will be taken off your meal
                            plan.
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
                                disabled={removeRecipe.isPending}
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
