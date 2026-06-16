import type { ReactNode } from 'react'

interface ScreenProps {
    title: string
    /** Toolbar actions shown at the right of the header. */
    right?: ReactNode
    /** Optional search bar rendered under the header. */
    search?: ReactNode
    loading?: boolean
    children?: ReactNode
}

/** Base screen scaffold (header title in Caprasimo + optional search + body). */
export function Screen({ title, right, search, loading, children }: ScreenProps) {
    return (
        <div className="screen">
            <div className="screen-deco" aria-hidden />
            {right && <div className="screen-actions">{right}</div>}
            <header className="screen-header">
                <h1 className="screen-title">{title}</h1>
            </header>
            {search}
            <div className="screen-content">
                {loading && (
                    <div className="screen-loading">
                        <span className="spinner" />
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}
