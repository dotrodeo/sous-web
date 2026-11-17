import { useEffect } from 'react'
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

/**
 * Starting Sous with no signal: signing in needs the network, so instead of a
 * blank screen say so, and load as soon as the connection is back.
 */
export function OfflineStartNotice() {
    const { isLoaded } = useAuth()
    const online = useOnline()

    useEffect(() => {
        if (isLoaded) return
        const reload = () => window.location.reload()
        window.addEventListener('online', reload)
        return () => window.removeEventListener('online', reload)
    }, [isLoaded])

    if (isLoaded || online) return null
    return (
        <div className="offline-start" role="alert">
            <div className="offline-start-title">you’re offline</div>
            <p>sous needs a connection to start. it’ll open as soon as you’re back online.</p>
            <p className="offline-start-hint">
                tip: open sous before you head out, and the list keeps working without signal.
            </p>
        </div>
    )
}
