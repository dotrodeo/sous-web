import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { PlusIcon, TrashIcon, CloseIcon } from '../components/Icons'
import { RecipeTagModal } from '../components/RecipeTagModal'
import { useRecipe, useUpsertRecipe, useImportRecipe } from '../hooks/useRecipes'
import type { Recipe, RecipePatch, RecipeTagPatch } from '../lib/types'

interface FormInitial {
    name: string
    prepTime: string
    cookTime: string
    servings: string
    ingredients: string[]
    instructions: string[]
    tags: RecipeTagPatch[]
}

function initialFrom(recipe: Recipe | undefined): FormInitial {
    return {
        name: recipe?.name ?? '',
        prepTime: recipe?.prepTime ?? '',
        cookTime: recipe?.cookTime ?? '',
        servings: recipe?.servings ?? '',
        ingredients: recipe?.ingredients?.map((i) => i.sentence) ?? [''],
        instructions: recipe?.instructions ?? [''],
        tags: recipe?.tags?.map((t) => ({ id: t.id, name: t.name })) ?? [],
    }
}

/** Loads the recipe (edit mode) then mounts the form with initial values. */
export function RecipeEditPage() {
    const { id } = useParams()
    const recipeId = id ? Number(id) : undefined
    const isEditing = recipeId != null
    const recipeQuery = useRecipe(recipeId)

    if (isEditing && recipeQuery.isLoading) {
        return <Screen title="edit recipe" loading />
    }

    return (
        <RecipeForm
            key={recipeId ?? 'new'}
            recipeId={recipeId}
            isEditing={isEditing}
            initial={initialFrom(recipeQuery.data)}
        />
    )
}

interface RecipeFormProps {
    recipeId: number | undefined
    isEditing: boolean
    initial: FormInitial
}

function RecipeForm({ recipeId, isEditing, initial }: RecipeFormProps) {
    const navigate = useNavigate()
    const upsert = useUpsertRecipe()
    const importRecipe = useImportRecipe()

    const [name, setName] = useState(initial.name)
    const [prepTime, setPrepTime] = useState(initial.prepTime)
    const [cookTime, setCookTime] = useState(initial.cookTime)
    const [servings, setServings] = useState(initial.servings)
    const [ingredients, setIngredients] = useState<string[]>(initial.ingredients)
    const [instructions, setInstructions] = useState<string[]>(initial.instructions)
    const [tags, setTags] = useState<RecipeTagPatch[]>(initial.tags)
    const [tagModal, setTagModal] = useState(false)
    const [busy, setBusy] = useState(false)

    function updateAt(
        list: string[],
        setList: (v: string[]) => void,
        index: number,
        value: string,
    ) {
        const next = [...list]
        next[index] = value
        setList(next)
    }

    async function handleImport() {
        const url = window.prompt('Paste a recipe URL to import:')
        if (!url) return
        setBusy(true)
        try {
            const imported = await importRecipe.mutateAsync(url)
            if (imported) {
                if (imported.name) setName(imported.name)
                if (imported.prepTime) setPrepTime(imported.prepTime)
                if (imported.cookTime) setCookTime(imported.cookTime)
                if (imported.servings) setServings(imported.servings)
                if (imported.ingredients?.length) setIngredients(imported.ingredients)
                if (imported.instructions?.length) setInstructions(imported.instructions)
            }
        } catch {
            alert('Couldn’t import that URL.')
        } finally {
            setBusy(false)
        }
    }

    async function save() {
        setBusy(true)
        const patch: RecipePatch = {
            id: recipeId,
            name: name.trim(),
            prepTime: prepTime.trim() || undefined,
            cookTime: cookTime.trim() || undefined,
            servings: servings.trim() || undefined,
            ingredients: ingredients.map((s) => s.trim()).filter(Boolean),
            instructions: instructions.map((s) => s.trim()).filter(Boolean),
            tags,
        }
        try {
            const saved = await upsert.mutateAsync(patch)
            navigate(`/recipes/${saved.id}`)
        } catch {
            alert('Couldn’t save the recipe.')
            setBusy(false)
        }
    }

    return (
        <Screen
            title={isEditing ? 'edit recipe' : 'new recipe'}
            loading={busy}
            right={
                <div className="detail-actions">
                    {!isEditing && (
                        <button className="text-btn" type="button" onClick={handleImport}>
                            import
                        </button>
                    )}
                    <button
                        className="text-btn save-btn"
                        type="button"
                        disabled={!name.trim() || busy}
                        onClick={save}
                    >
                        save
                    </button>
                </div>
            }
        >
            <div className="form">
                <Field label="name" value={name} onChange={setName} placeholder="hot tamales" />
                <Field
                    label="prep time"
                    value={prepTime}
                    onChange={setPrepTime}
                    placeholder="15 minutes"
                />
                <Field
                    label="cook time"
                    value={cookTime}
                    onChange={setCookTime}
                    placeholder="30 minutes"
                />
                <Field label="servings" value={servings} onChange={setServings} placeholder="5-6" />

                <ListField
                    label="ingredients"
                    values={ingredients}
                    placeholder="1 cup flour"
                    onChangeAt={(i, v) => updateAt(ingredients, setIngredients, i, v)}
                    onRemoveAt={(i) => setIngredients(ingredients.filter((_, idx) => idx !== i))}
                    onAdd={() => setIngredients([...ingredients, ''])}
                />

                <ListField
                    label="instructions"
                    values={instructions}
                    placeholder="Preheat the oven…"
                    multiline
                    onChangeAt={(i, v) => updateAt(instructions, setInstructions, i, v)}
                    onRemoveAt={(i) => setInstructions(instructions.filter((_, idx) => idx !== i))}
                    onAdd={() => setInstructions([...instructions, ''])}
                />

                <div className="field">
                    <span className="field-label">tags</span>
                    <div className="tag-pills">
                        {tags.map((t, i) => (
                            <span key={`${t.name}-${i}`} className="tag-pill">
                                {t.name}
                                <button
                                    type="button"
                                    aria-label={`Remove ${t.name}`}
                                    onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                                >
                                    <CloseIcon size={14} />
                                </button>
                            </span>
                        ))}
                        <button className="tag-add" type="button" onClick={() => setTagModal(true)}>
                            <PlusIcon size={16} /> add tag
                        </button>
                    </div>
                </div>
            </div>

            {tagModal && (
                <RecipeTagModal
                    addedNames={tags.map((t) => t.name ?? '')}
                    onAdd={(patch) => {
                        setTags((prev) => [...prev, patch])
                        setTagModal(false)
                    }}
                    onClose={() => setTagModal(false)}
                />
            )}
        </Screen>
    )
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <input
                className="field-input"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    )
}

function ListField({
    label,
    values,
    placeholder,
    multiline,
    onChangeAt,
    onRemoveAt,
    onAdd,
}: {
    label: string
    values: string[]
    placeholder?: string
    multiline?: boolean
    onChangeAt: (index: number, value: string) => void
    onRemoveAt: (index: number) => void
    onAdd: () => void
}) {
    return (
        <div className="field">
            <span className="field-label">{label}</span>
            {values.map((value, i) => (
                <div key={i} className="list-field-row">
                    {multiline ? (
                        <textarea
                            className="field-input"
                            value={value}
                            placeholder={placeholder}
                            rows={2}
                            onChange={(e) => onChangeAt(i, e.target.value)}
                        />
                    ) : (
                        <input
                            className="field-input"
                            value={value}
                            placeholder={placeholder}
                            onChange={(e) => onChangeAt(i, e.target.value)}
                        />
                    )}
                    <button
                        className="row-minus"
                        type="button"
                        aria-label="Remove"
                        onClick={() => onRemoveAt(i)}
                    >
                        <TrashIcon size={16} />
                    </button>
                </div>
            ))}
            <button className="tag-add" type="button" onClick={onAdd}>
                <PlusIcon size={16} /> add {label.replace(/s$/, '')}
            </button>
        </div>
    )
}
