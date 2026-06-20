import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircleIcon, LinkIcon, PlusIcon, TrashIcon, XIcon } from '../components/Icons'
import { useImportRecipe, useRecipe, useUpsertRecipe } from '../hooks/useRecipes'
import type { RecipePatch } from '../lib/types'

interface Row {
    id: string
    text: string
}

interface FormInitial {
    name: string
    prep: string
    cook: string
    servings: string
    ingredients: Row[]
    instructions: Row[]
    tags: string[]
}

/** Loads the recipe (edit) or seeds an empty form (new), then key-remounts the
 *  form so its initial state is set once without a setState-in-effect. */
export function RecipeEditPage() {
    const { id } = useParams()
    const recipeId = id ? Number(id) : undefined
    const { data: recipe, isLoading } = useRecipe(recipeId)

    if (recipeId == null) {
        return (
            <RecipeEditForm
                key="new"
                recipeId={undefined}
                initial={{
                    name: '',
                    prep: '',
                    cook: '',
                    servings: '',
                    ingredients: [{ id: 'ing0', text: '' }],
                    instructions: [{ id: 'ins0', text: '' }],
                    tags: [],
                }}
            />
        )
    }

    if (!recipe) {
        return (
            <div className="content edit">
                <div className="empty-state">
                    <div className="title">{isLoading ? 'loading…' : 'recipe not found'}</div>
                </div>
            </div>
        )
    }

    return (
        <RecipeEditForm
            key={recipe.id}
            recipeId={recipe.id}
            initial={{
                name: recipe.name,
                prep: recipe.prepTime ?? '',
                cook: recipe.cookTime ?? '',
                servings: recipe.servings ?? '',
                ingredients: (recipe.ingredients ?? []).map((i, n) => ({
                    id: `ing${n}`,
                    text: i.sentence,
                })),
                instructions: (recipe.instructions ?? []).map((t, n) => ({
                    id: `ins${n}`,
                    text: t,
                })),
                tags: (recipe.tags ?? []).map((t) => t.name),
            }}
        />
    )
}

function RecipeEditForm({
    recipeId,
    initial,
}: {
    recipeId: number | undefined
    initial: FormInitial
}) {
    const navigate = useNavigate()
    const upsertRecipe = useUpsertRecipe()
    const importRecipe = useImportRecipe()
    const seq = useRef(100)
    const nextId = (p: string) => `${p}${seq.current++}`

    const isNew = recipeId == null
    const title = isNew ? 'new recipe' : 'edit recipe'

    const [name, setName] = useState(initial.name)
    const [prep, setPrep] = useState(initial.prep)
    const [cook, setCook] = useState(initial.cook)
    const [servings, setServings] = useState(initial.servings)
    const [ingredients, setIngredients] = useState<Row[]>(
        initial.ingredients.length ? initial.ingredients : [{ id: 'ing0', text: '' }],
    )
    const [instructions, setInstructions] = useState<Row[]>(
        initial.instructions.length ? initial.instructions : [{ id: 'ins0', text: '' }],
    )
    const [tags, setTags] = useState<string[]>(initial.tags)
    const [addingTag, setAddingTag] = useState(false)
    const [newTag, setNewTag] = useState('')

    const [importOpen, setImportOpen] = useState(false)
    const [importUrl, setImportUrl] = useState('')
    const [importError, setImportError] = useState('')

    // A recipe needs a name and at least one ingredient (empty rows are dropped
    // on save, so a blank ingredient list must not be saveable).
    const hasIngredient = ingredients.some((i) => i.text.trim().length > 0)
    const canSave = name.trim().length > 0 && hasIngredient

    const commitTag = () => {
        const v = newTag.trim()
        setTags((prev) => (v && !prev.includes(v) ? [...prev, v] : prev))
        setNewTag('')
        setAddingTag(false)
    }

    const save = () => {
        if (!canSave) return
        const patch: RecipePatch = {
            ...(recipeId != null ? { id: recipeId } : {}),
            name: name.trim(),
            prepTime: prep.trim(),
            cookTime: cook.trim(),
            servings: servings.trim(),
            ingredients: ingredients.map((i) => i.text.trim()).filter(Boolean),
            instructions: instructions.map((i) => i.text.trim()).filter(Boolean),
            tags: tags.map((t) => ({ name: t })),
        }
        upsertRecipe.mutate(patch, {
            onSuccess: (saved) => navigate(`/recipes/${saved.id}`),
        })
    }

    const runImport = () => {
        const url = importUrl.trim()
        if (!url) {
            setImportError('Paste a recipe URL first.')
            return
        }
        setImportError('')
        importRecipe.mutate(url, {
            onSuccess: (data) => {
                if (!data) {
                    setImportError(
                        'Could not read a recipe from that link. Check the URL and try again.',
                    )
                    return
                }
                if (data.name) setName(data.name)
                if (data.prepTime) setPrep(data.prepTime)
                if (data.cookTime) setCook(data.cookTime)
                if (data.servings) setServings(data.servings)
                if (data.ingredients?.length) {
                    setIngredients(data.ingredients.map((t) => ({ id: nextId('ing'), text: t })))
                }
                if (data.instructions?.length) {
                    setInstructions(data.instructions.map((t) => ({ id: nextId('ins'), text: t })))
                }
                setImportOpen(false)
                setImportUrl('')
            },
            onError: () =>
                setImportError(
                    'Could not read a recipe from that link. Check the URL and try again.',
                ),
        })
    }

    return (
        <>
            <div className="blob">
                <div className="blob-actions blob-edit-actions">
                    {isNew && (
                        <button
                            type="button"
                            className="btn-text"
                            onClick={() => setImportOpen(true)}
                        >
                            import
                        </button>
                    )}
                    <button type="button" className="btn-save" disabled={!canSave} onClick={save}>
                        save
                    </button>
                </div>
            </div>

            <div className="content edit">
                <div className="edit-header">
                    <h1 className="edit-title">{title}</h1>
                    <div className="edit-header-actions">
                        {isNew && (
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => setImportOpen(true)}
                            >
                                import
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn-save"
                            disabled={!canSave}
                            onClick={save}
                        >
                            save
                        </button>
                    </div>
                </div>

                <h1 className="detail-mobile-title edit-mobile-title">{title}</h1>

                <div className="form-field">
                    <label className="form-label" htmlFor="r-name">
                        name
                    </label>
                    <input
                        id="r-name"
                        className="field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="hot tamales"
                    />
                </div>

                <div className="meta-grid">
                    <div>
                        <label className="form-label" htmlFor="r-prep">
                            prep time
                        </label>
                        <input
                            id="r-prep"
                            className="field"
                            value={prep}
                            onChange={(e) => setPrep(e.target.value)}
                            placeholder="15 minutes"
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="r-cook">
                            cook time
                        </label>
                        <input
                            id="r-cook"
                            className="field"
                            value={cook}
                            onChange={(e) => setCook(e.target.value)}
                            placeholder="30 minutes"
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="r-serv">
                            servings
                        </label>
                        <input
                            id="r-serv"
                            className="field"
                            value={servings}
                            onChange={(e) => setServings(e.target.value)}
                            placeholder="5-6"
                        />
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">ingredients</label>
                    <div className="edit-rows">
                        {ingredients.map((row) => (
                            <div className="edit-row" key={row.id}>
                                <input
                                    className="field"
                                    value={row.text}
                                    onChange={(e) =>
                                        setIngredients((prev) =>
                                            prev.map((x) =>
                                                x.id === row.id
                                                    ? { ...x, text: e.target.value }
                                                    : x,
                                            ),
                                        )
                                    }
                                    placeholder="1 cup flour"
                                />
                                <button
                                    type="button"
                                    className="btn-remove"
                                    aria-label="remove ingredient"
                                    onClick={() =>
                                        setIngredients((prev) =>
                                            prev.filter((x) => x.id !== row.id),
                                        )
                                    }
                                >
                                    <TrashIcon size={22} />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn-dashed"
                            onClick={() =>
                                setIngredients((prev) => [...prev, { id: nextId('ing'), text: '' }])
                            }
                        >
                            <PlusIcon size={18} />
                            add ingredient
                        </button>
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">instructions</label>
                    <div className="edit-rows">
                        {instructions.map((row) => (
                            <div className="edit-row top" key={row.id}>
                                <textarea
                                    className="field"
                                    value={row.text}
                                    onChange={(e) =>
                                        setInstructions((prev) =>
                                            prev.map((x) =>
                                                x.id === row.id
                                                    ? { ...x, text: e.target.value }
                                                    : x,
                                            ),
                                        )
                                    }
                                    placeholder="Preheat the oven…"
                                />
                                <button
                                    type="button"
                                    className="btn-remove top"
                                    aria-label="remove instruction"
                                    onClick={() =>
                                        setInstructions((prev) =>
                                            prev.filter((x) => x.id !== row.id),
                                        )
                                    }
                                >
                                    <TrashIcon size={22} />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn-dashed"
                            onClick={() =>
                                setInstructions((prev) => [
                                    ...prev,
                                    { id: nextId('ins'), text: '' },
                                ])
                            }
                        >
                            <PlusIcon size={18} />
                            add instruction
                        </button>
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">tags</label>
                    <div className="tag-wrap">
                        {tags.map((tag, i) => (
                            <span className="tag-pill" key={`${tag}-${i}`}>
                                {tag}
                                <button
                                    type="button"
                                    className="tag-remove"
                                    aria-label="remove tag"
                                    onClick={() =>
                                        setTags((prev) => prev.filter((_, j) => j !== i))
                                    }
                                >
                                    <XIcon size={11} />
                                </button>
                            </span>
                        ))}
                        {addingTag ? (
                            <input
                                className="tag-input"
                                autoFocus
                                value={newTag}
                                placeholder="tag name"
                                onChange={(e) => setNewTag(e.target.value)}
                                onBlur={commitTag}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        commitTag()
                                    } else if (e.key === 'Escape') {
                                        setAddingTag(false)
                                        setNewTag('')
                                    }
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                className="btn-dashed pill"
                                onClick={() => {
                                    setNewTag('')
                                    setAddingTag(true)
                                }}
                            >
                                <PlusIcon size={16} />
                                add tag
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {importOpen && (
                <div className="modal-backdrop" style={{ zIndex: 70 }}>
                    <div
                        className="modal-scrim"
                        onClick={() => !importRecipe.isPending && setImportOpen(false)}
                    />
                    <div className="modal-card wide">
                        <div className="import-head">
                            <div className="modal-badge info">
                                <LinkIcon size={24} />
                            </div>
                            <div className="import-title">import recipe</div>
                        </div>
                        <div className="import-body">
                            Paste a link to a recipe and we’ll pull out the ingredients, steps, and
                            details for you.
                        </div>
                        <input
                            className="field"
                            style={{ marginTop: 18 }}
                            type="url"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    runImport()
                                }
                            }}
                            placeholder="https://…"
                        />
                        {importError && (
                            <div className="import-error">
                                <AlertCircleIcon size={18} style={{ flex: 'none', marginTop: 1 }} />
                                <span>{importError}</span>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                onClick={() => setImportOpen(false)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                disabled={importRecipe.isPending}
                                onClick={runImport}
                            >
                                {importRecipe.isPending ? (
                                    <>
                                        <span className="spinner" />
                                        importing…
                                    </>
                                ) : (
                                    'import recipe'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
