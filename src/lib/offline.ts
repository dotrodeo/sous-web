// Offline support (#38): the household's data is kept in localStorage so it shows
// at once and survives iOS closing the app, and quick shopping-list changes made
// without a connection are queued and synced, in order, when it's back.
//
// Only works once Sous has started: signing in needs the network (Clerk), so a
// cold start with no signal shows a notice instead (see OfflineStartNotice).
import { onlineManager, type Mutation, type Query, type QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { useSyncExternalStore } from 'react'
import { ApiError, type ApiClient } from './api'
import { pantryService } from './services'
import type { Pantry, PantryItem, PantryItemPatch } from './types'

// TanStack assumes online until an 'offline' event, which never fires for a page
// that starts without signal; start from what the browser knows.
if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    onlineManager.setOnline(navigator.onLine)
}

const STORAGE_KEY = 'sous-cache'
/** Bump only when the cached data's shape changes; it discards queued changes too. */
const CACHE_VERSION = '1'
/** Saved data older than this is discarded (and the in-memory cache keeps it as
 *  long, so it's still there to save). */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Queries worth having offline: the household's data and the signed-in user. */
const PERSISTED = new Set([
    'user',
    'pantry',
    'categories',
    'recipes',
    'recipe',
    'recipeTags',
    'plan',
    'meals',
    'ingredientLinks',
])

export const persister = createSyncStoragePersister({
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
    key: STORAGE_KEY,
    throttleTime: 1000,
})

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
    persister,
    maxAge: CACHE_MAX_AGE_MS,
    buster: CACHE_VERSION,
    dehydrateOptions: {
        shouldDehydrateQuery: (q: Query) =>
            q.state.status === 'success' && PERSISTED.has(String(q.queryKey[0])),
        // Queued (paused) list changes survive a reload and sync when back online.
        shouldDehydrateMutation: (m: Mutation) => m.state.isPaused,
    },
}

/** Forgets the saved copy and anything queued (on sign-out, or another account). */
export async function clearOfflineCache(queryClient: QueryClient) {
    queryClient.getMutationCache().clear()
    queryClient.clear()
    await persister.removeClient()
}

/** Whether the browser thinks it's online (navigator.onLine, via TanStack). */
export function useOnline(): boolean {
    return useSyncExternalStore(
        (cb) => onlineManager.subscribe(cb),
        () => onlineManager.isOnline(),
        () => true,
    )
}

// --- queued pantry-item patches -------------------------------------------

/** Key of the mutation that patches an existing pantry item (check off, uncheck,
 *  put on or take off the list). Its defaults are registered by
 *  useOfflineMutations, so queued ones can be replayed after a reload. */
export const PANTRY_PATCH = ['pantry-item-patch'] as const

export interface PantryPatchVars {
    householdId: number
    pantryId: number
    /** Must have the item's id: only existing items can be changed offline. */
    patch: PantryItemPatch & { id: number; name: string }
}

function isClientError(error: unknown) {
    return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/** Registers how queued item patches run; call once signed in (needs the API). */
export function registerPantryPatch(queryClient: QueryClient, api: ApiClient) {
    queryClient.setMutationDefaults(PANTRY_PATCH, {
        mutationFn: ({ householdId, pantryId, patch }: PantryPatchVars) =>
            pantryService.upsertItem(api, householdId, pantryId, patch),
        // Show the change at once, online or not.
        onMutate: async ({ householdId, patch }: PantryPatchVars) => {
            const key = ['pantry', householdId]
            await queryClient.cancelQueries({ queryKey: key })
            queryClient.setQueryData<Pantry>(key, (old) =>
                old
                    ? {
                          ...old,
                          pantryItems: (old.pantryItems ?? []).map((it: PantryItem) =>
                              it.id === patch.id ? { ...it, ...patch } : it,
                          ),
                      }
                    : old,
            )
        },
        // Once it has reached the server (or been refused), reload the truth.
        onSettled: (_data, _error, { householdId }: PantryPatchVars) =>
            queryClient.invalidateQueries({ queryKey: ['pantry', householdId] }),
        // Offline, TanStack pauses the mutation instead. Online but flaky (a store
        // with one bar): keep retrying network failures; never retry a 4xx.
        retry: (count: number, error: unknown) => !isClientError(error) && count < 20,
        retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
        // One at a time, in the order they were made: last write wins.
        scope: { id: 'pantry-item-patch' },
    })
}
