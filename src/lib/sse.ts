// Real-time household updates over Server-Sent Events, mirroring
// sous-swift/Services/SSEService.swift (endpoint /events/{householdId},
// Authorization: Bearer <jwt>).
//
// The browser's native EventSource cannot send custom headers, and the backend
// authenticates the stream via the Authorization header — so we use SSE-over-
// fetch (@microsoft/fetch-event-source), which also lets us inject a *fresh*
// Clerk token on every (re)connect via a custom fetch.

import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { GetToken } from './api'

/** Matches SSEMessageType in SSEService.swift. */
export type SSEMessageType =
    | 'recipe_update'
    | 'recipe_delete'
    | 'pantry_update'
    | 'category_update'
    | 'user_update'

/** Matches SSEEvent in SSEService.swift. */
export interface SSEEvent {
    type: SSEMessageType | null
    from: string | null
    message: string | null
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL

/** Thrown to stop reconnection attempts (e.g. on auth failure). */
class FatalSSEError extends Error {}

interface SubscribeOptions {
    householdId: number
    getToken: GetToken
    signal: AbortSignal
    onEvent: (event: SSEEvent) => void
}

/**
 * Opens the household event stream and invokes onEvent for each decoded event.
 * Resolves when the signal aborts; the library handles transient reconnects.
 */
export function subscribeToHouseholdEvents({
    householdId,
    getToken,
    signal,
    onEvent,
}: SubscribeOptions): Promise<void> {
    const url = `${BASE_URL.replace(/\/$/, '')}/events/${householdId}`

    return fetchEventSource(url, {
        signal,
        // Keep the stream alive when the tab is backgrounded.
        openWhenHidden: true,
        // Re-injects a fresh Bearer token on the initial request and every retry.
        fetch: async (input, init) => {
            const token = await getToken()
            const headers = new Headers(init?.headers)
            if (token) headers.set('Authorization', `Bearer ${token}`)
            return fetch(input, { ...init, headers })
        },
        onopen: async (res) => {
            if (res.ok) return
            // Auth/permission failures won't fix themselves — stop retrying.
            if (res.status === 401 || res.status === 403) {
                throw new FatalSSEError(`SSE auth failed: ${res.status}`)
            }
            throw new Error(`SSE open failed: ${res.status}`)
        },
        onmessage: (msg) => {
            if (!msg.data) return
            try {
                onEvent(JSON.parse(msg.data) as SSEEvent)
            } catch {
                // Ignore keep-alives / non-JSON frames, matching the Swift decoder.
            }
        },
        onerror: (err) => {
            // Rethrow fatal errors to abort; anything else uses the default backoff.
            if (err instanceof FatalSSEError) throw err
            if (import.meta.env.DEV) console.warn('SSE error, will retry:', err)
        },
    })
}
