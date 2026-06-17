import type { ReactNode } from 'react'
import { PlusIcon } from './Icons'

interface ScreenAction {
    label: string
    onClick: () => void
}

interface ScreenProps {
    title: string
    /** Primary action — a FAB in the mobile blob header, a pill in the desktop header. */
    action?: ScreenAction
    children?: ReactNode
}

/** Per-screen scaffold: sunflower blob header (mobile) / large title + action
 *  (desktop), then the content column. */
export function Screen({ title, action, children }: ScreenProps) {
    return (
        <>
            <div className="blob">
                <div className="blob-actions">
                    {action && (
                        <button
                            className="fab"
                            type="button"
                            aria-label={action.label}
                            onClick={action.onClick}
                        >
                            <PlusIcon size={24} />
                        </button>
                    )}
                </div>
            </div>

            <div className="content">
                <div className="desktop-header">
                    <h1 className="screen-title">{title}</h1>
                    {action && (
                        <button className="btn-primary" type="button" onClick={action.onClick}>
                            <PlusIcon size={20} />
                            {action.label}
                        </button>
                    )}
                </div>

                <h1 className="screen-title">{title}</h1>

                {children}
            </div>
        </>
    )
}
