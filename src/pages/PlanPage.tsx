import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { CalendarIcon, PlusIcon } from '../components/Icons'
import { PlanDayRow } from '../components/PlanDayRow'
import { RecipeSelector } from '../components/RecipeSelector'
import { IMadeThisModal } from '../components/IMadeThisModal'
import {
    usePlan,
    useAddPlanDay,
    useAddRecipesToPlan,
    useRemoveRecipeFromPlan,
} from '../hooks/usePlan'
import { useRecipes, useCompleteRecipe } from '../hooks/useRecipes'
import { usePantry } from '../hooks/usePantry'
import { recipeRatio, matchIngredientsToPantry } from '../lib/recipeHelper'
import { upcomingFormat, relativeDay, isWithinThreeDaysOrPast } from '../lib/dateHelper'
import type { PlanDay, Recipe, RecipeCompletion } from '../lib/types'

export function PlanPage() {
    const navigate = useNavigate()
    const planQuery = usePlan()
    const recipesQuery = useRecipes()
    const pantryQuery = usePantry()

    const addPlanDay = useAddPlanDay()
    const addRecipes = useAddRecipesToPlan()
    const removeRecipe = useRemoveRecipeFromPlan()
    const completeRecipe = useCompleteRecipe()

    const [selectingDay, setSelectingDay] = useState<PlanDay | null>(null)
    const [addingDay, setAddingDay] = useState(false)
    const [completing, setCompleting] = useState<Recipe | null>(null)

    const plan = planQuery.data
    const pantryItems = useMemo(() => pantryQuery.data?.pantryItems ?? [], [pantryQuery.data])
    const allRecipes = recipesQuery.data ?? []

    // Future plan days: undated ("any time") or today onward, undated first then A→Z by date.
    const futureDays = useMemo(() => {
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        return (plan?.planDays ?? [])
            .filter((d) => {
                if (!d.date) return true
                const t = new Date(d.date)
                t.setHours(0, 0, 0, 0)
                return t.getTime() >= startOfToday.getTime()
            })
            .sort((a, b) => {
                if (!a.date && !b.date) return 0
                if (!a.date) return -1
                if (!b.date) return 1
                return new Date(a.date).getTime() - new Date(b.date).getTime()
            })
    }, [plan])

    function handleComplete(completion: RecipeCompletion) {
        completeRecipe.mutate({ recipeId: completion.recipeId, completion })
        setCompleting(null)
    }

    // For "I made this" we need the full recipe (ingredients) to match the pantry.
    const completingFull = completing
        ? (allRecipes.find((r) => r.id === completing.id) ?? completing)
        : null
    const completingMatches = completingFull
        ? matchIngredientsToPantry(completingFull, pantryItems)
        : []

    return (
        <Screen
            title="plan"
            loading={planQuery.isLoading}
            right={
                <button
                    className="icon-btn"
                    type="button"
                    aria-label="Add plan day"
                    onClick={() => setAddingDay(true)}
                >
                    <CalendarIcon />
                </button>
            }
        >
            {planQuery.isError && <p className="empty-state">Couldn’t load your plan.</p>}

            {planQuery.isSuccess && futureDays.length === 0 && (
                <p className="empty-state">No upcoming plan days. Tap the calendar to add one.</p>
            )}

            {futureDays.map((day) => {
                const dateText = day.date ? upcomingFormat(day.date) : 'any time'
                const pill =
                    day.date && isWithinThreeDaysOrPast(day.date) ? relativeDay(day.date) : null
                const recipes = [...day.recipes].sort((a, b) =>
                    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
                )

                return (
                    <section key={day.id} className="plan-section">
                        <div className="plan-day-header">
                            <span className="category-header" style={{ margin: 0 }}>
                                {dateText.toLowerCase()}
                            </span>
                            {pill && <span className="plan-pill">{pill}</span>}
                        </div>

                        <div className="pantry-list">
                            {recipes.length === 0 ? (
                                <p className="plan-empty">nothing planned here</p>
                            ) : (
                                recipes.map((recipe) => (
                                    <PlanDayRow
                                        key={recipe.id}
                                        recipe={recipe}
                                        ratio={recipeRatio(recipe, pantryItems)}
                                        onTap={() => navigate(`/recipes/${recipe.id}`)}
                                        onUnplan={() =>
                                            removeRecipe.mutate({
                                                planDayId: day.id,
                                                recipeId: recipe.id,
                                            })
                                        }
                                        onCompletion={() => setCompleting(recipe)}
                                    />
                                ))
                            )}
                        </div>

                        <button
                            className="plan-add-recipe"
                            type="button"
                            onClick={() => setSelectingDay(day)}
                        >
                            <PlusIcon size={16} /> add a recipe
                        </button>
                    </section>
                )
            })}

            {selectingDay && (
                <RecipeSelector
                    recipes={allRecipes}
                    onClose={() => setSelectingDay(null)}
                    onSave={(recipeIds) => {
                        addRecipes.mutate({ planDayId: selectingDay.id, recipeIds })
                        setSelectingDay(null)
                    }}
                />
            )}

            {addingDay && (
                <AddPlanDayModal
                    onClose={() => setAddingDay(false)}
                    onSave={(date) => {
                        if (plan) addPlanDay.mutate({ planId: plan.id, date })
                        setAddingDay(false)
                    }}
                />
            )}

            {completing && completingFull && (
                <IMadeThisModal
                    recipe={completingFull}
                    matched={completingMatches}
                    onClose={() => setCompleting(null)}
                    onSave={handleComplete}
                />
            )}
        </Screen>
    )
}

function AddPlanDayModal({
    onClose,
    onSave,
}: {
    onClose: () => void
    onSave: (isoDate: string) => void
}) {
    const [value, setValue] = useState('')

    function save() {
        if (!value) return
        // Anchor at local noon so the chosen calendar day survives the UTC conversion.
        onSave(new Date(`${value}T12:00:00`).toISOString())
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal date-modal" onClick={(e) => e.stopPropagation()}>
                <div className="item-modal-head">
                    <h2 className="section-title">select a date</h2>
                    <button
                        className="text-btn save-btn"
                        type="button"
                        disabled={!value}
                        onClick={save}
                    >
                        save
                    </button>
                </div>
                <input
                    className="field-input"
                    type="date"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
        </div>
    )
}
