import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, TrashIcon } from '../components/Icons'
import { useIngredientLinks, useRemoveIngredientLink } from '../hooks/useIngredientLinks'

/** Settings → ingredient matches (#39): review and remove the household's fixes. */
export function IngredientMatchesPage() {
    const navigate = useNavigate()
    const { data: links, isLoading } = useIngredientLinks()
    const remove = useRemoveIngredientLink()

    return (
        <>
            <div className="blob between">
                <div className="blob-actions">
                    <button
                        type="button"
                        className="fab"
                        aria-label="back"
                        onClick={() => navigate('/settings')}
                    >
                        <ChevronLeftIcon size={24} />
                    </button>
                </div>
            </div>

            <div className="content">
                <div className="detail-header">
                    <div className="detail-header-left">
                        <button
                            type="button"
                            className="btn-round"
                            aria-label="back"
                            onClick={() => navigate('/settings')}
                        >
                            <ChevronLeftIcon size={22} />
                        </button>
                        <h1 className="detail-title">ingredient matches</h1>
                    </div>
                </div>

                <h1 className="detail-mobile-title">ingredient matches</h1>
                <p className="match-intro">
                    How recipe ingredients match your pantry, where you’ve chosen. Remove one to go
                    back to automatic matching.
                </p>

                {!isLoading && (links ?? []).length === 0 && (
                    <div className="empty-state">
                        <div className="title">no matches yet</div>
                        <div>
                            On a recipe, tap an ingredient to match it to a pantry item, or to mark
                            it as something you always have.
                        </div>
                    </div>
                )}

                {(links ?? []).length > 0 && (
                    <div className="match-rows">
                        {(links ?? []).map((l) => {
                            const target =
                                l.pantryItemId == null
                                    ? 'always have (not tracked)'
                                    : l.pantryItem?.deletedAt
                                      ? `${l.pantryItem.name} (deleted, matched automatically)`
                                      : (l.pantryItem?.name ?? 'unknown item')
                            return (
                                <div className="match-row" key={l.id}>
                                    <div className="match-row-text">
                                        <span className="match-row-name">{l.name}</span>
                                        <span className="match-row-target">→ {target}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="row-icon-btn"
                                        aria-label={`remove the match for ${l.name}`}
                                        disabled={remove.isPending}
                                        onClick={() => remove.mutate(l.id)}
                                    >
                                        <TrashIcon size={20} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}
