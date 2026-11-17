import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useIsRestoring, useMutationState, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { PANTRY_PATCH, clearOfflineCache, registerPantryPatch, useOnline } from '../lib/offline'
import type { User } from '../lib/types'

/**
 * Signed-in setup for offline use (#38): registers how queued list changes run,
 * replays any saved from before a reload, and drops a saved copy that belongs to
 * another account (a shared device).
 */
export function OfflineSync() {
    const api = useApi()
    const qc = useQueryClient()
    const restoring = useIsRestoring()
    const { userId } = useAuth()

    useEffect(() => {
        registerPantryPatch(qc, api)
    }, [qc, api])

    useEffect(() => {
        if (restoring || !userId) return
        const saved = qc.getQueryData<User>(['user'])
        if (saved && saved.id !== userId && saved.clerkId !== userId) {
            void clearOfflineCache(qc)
            return
        }
        void qc.resumePausedMutations()
    }, [restoring, userId, qc])

    return null
}

/** A small pill while offline, or while queued changes are syncing. */
export function OfflineBar() {
    const online = useOnline()
    const waiting = useMutationState({
        filters: { mutationKey: PANTRY_PATCH, status: 'pending' },
    }).length
    if (online && waiting === 0) return null

    const changes = `${waiting} change${waiting === 1 ? '' : 's'}`
    const text = !online
        ? waiting
            ? `offline · ${changes} waiting to sync`
            : 'offline · showing saved data'
        : `syncing ${changes}…`
    return (
        <div className={`offline-bar${online ? ' syncing' : ''}`} role="status">
            {text}
        </div>
    )
}

/** Full-screen "can't start" message; reloads when the connection returns. */
export function StartOffline({ online = false }: { online?: boolean }) {
    useEffect(() => {
        const reload = () => window.location.reload()
        window.addEventListener('online', reload)
        return () => window.removeEventListener('online', reload)
    }, [])

    return (
        <div className="offline-start" role="alert">
            <div className="offline-start-title">
                {online ? 'can’t reach sign-in' : 'you’re offline'}
            </div>
            <p>
                {online
                    ? 'sous couldn’t load sign-in. check your connection and try again.'
                    : 'sous needs a connection to start. it’ll open as soon as you’re back online.'}
            </p>
            {!online && (
                <p className="offline-start-hint">
                    tip: open sous before you head out, and the list keeps working without signal.
                </p>
            )}
            <button
                type="button"
                className="btn-pill offline-start-retry"
                onClick={() => window.location.reload()}
            >
                try again
            </button>
        </div>
    )
}

/**
 * Starting Sous with no signal while Clerk is still trying to load: say so
 * instead of showing a blank screen. (If Clerk's script fails outright, it
 * throws; StartupErrorBoundary shows the same screen.)
 */
export function OfflineStartNotice() {
    const { isLoaded } = useAuth()
    const online = useOnline()
    // Clerk reports a failed script load as an unhandled rejection, not a render
    // error; and with a connection it may just never finish. Either way, say so.
    const [stuck, setStuck] = useState(false)
    // Until Clerk has loaded, a returning connection reloads the page. This lives
    // here, not in StartOffline: coming online unmounts that before its listener runs.
    useEffect(() => {
        if (isLoaded) return
        const reload = () => window.location.reload()
        window.addEventListener('online', reload)
        return () => window.removeEventListener('online', reload)
    }, [isLoaded])
    useEffect(() => {
        if (isLoaded) return
        const failed = (e: PromiseRejectionEvent | ErrorEvent) => {
            const reason = 'reason' in e ? e.reason : e.error
            const message = String(reason?.message ?? reason ?? '')
            if (/failed_to_load_clerk_js|Failed to load Clerk/.test(message)) setStuck(true)
        }
        const timer = window.setTimeout(() => setStuck(true), 10_000)
        window.addEventListener('unhandledrejection', failed)
        window.addEventListener('error', failed)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener('unhandledrejection', failed)
            window.removeEventListener('error', failed)
        }
    }, [isLoaded])

    if (isLoaded) return null
    if (!online) return <StartOffline />
    if (stuck) return <StartOffline online />
    return null
}
