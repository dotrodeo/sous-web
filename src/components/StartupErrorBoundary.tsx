import { Component, type ReactNode } from 'react'
import { StartOffline } from './OfflineStatus'

/**
 * Catches Clerk failing to load (its script comes from Clerk's servers, so with
 * no signal it throws "failed_to_load_clerk_js" and React would unmount the whole
 * app, leaving a blank screen). Shows a "can't start" screen that reloads when
 * the connection returns. Anything else gets a plain reload screen.
 */
export class StartupErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null }
> {
    state = { error: null as Error | null }

    static getDerivedStateFromError(error: Error) {
        return { error }
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children
        if (
            !navigator.onLine ||
            /failed_to_load_clerk_js|Failed to load Clerk/.test(error.message)
        ) {
            return <StartOffline online={navigator.onLine} />
        }
        return (
            <div className="offline-start" role="alert">
                <div className="offline-start-title">something went wrong</div>
                <p>sous hit an error it couldn’t recover from.</p>
                <button
                    type="button"
                    className="btn-pill offline-start-retry"
                    onClick={() => window.location.reload()}
                >
                    reload
                </button>
            </div>
        )
    }
}
