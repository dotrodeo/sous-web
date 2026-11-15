// Timer alerts by web push (#22). This device subscribes to push and tells soupi
// about its running timers; soupi pushes an alert when one ends, so it arrives
// even when Sous is closed. On iPhone and iPad that works only in the app added to
// the Home Screen.
import type { ApiClient } from './api'

export type AlertsState =
    /** Subscribed: timers on this device alert when Sous is closed. */
    | 'on'
    /** Supported, not turned on yet. */
    | 'off'
    /** The user declined notifications; only the browser's settings can undo it. */
    | 'blocked'
    /** iPhone/iPad in a browser tab: push needs the Home Screen app. */
    | 'needs-home-screen'
    /** This browser has no web push, or the server has it switched off. */
    | 'unsupported'

interface Stored {
    endpoint: string
    subscriptionId: number
}

const STORAGE_KEY = 'sous-push'

function readStored(): Stored | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as Stored) : null
    } catch {
        return null
    }
}

function writeStored(value: Stored | null) {
    stored = value
    try {
        if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        else localStorage.removeItem(STORAGE_KEY)
    } catch {
        /* storage unavailable: alerts still work until the page reloads */
    }
    emit()
}

let stored = typeof window === 'undefined' ? null : readStored()
let serverOff = false
let api: ApiClient | null = null
const listeners = new Set<() => void>()

function emit() {
    snapshot = computeState()
    listeners.forEach((l) => l())
}

export function subscribeAlerts(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

function isAppleMobile() {
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
}

function isStandalone() {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
}

function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function computeState(): AlertsState {
    if (typeof window === 'undefined') return 'unsupported'
    if (!pushSupported())
        return isAppleMobile() && !isStandalone() ? 'needs-home-screen' : 'unsupported'
    if (serverOff) return 'unsupported'
    if (Notification.permission === 'denied') return 'blocked'
    return stored && Notification.permission === 'granted' ? 'on' : 'off'
}

let snapshot: AlertsState = computeState()

export function getAlertsState(): AlertsState {
    return snapshot
}

/** This device's subscription id at soupi, when alerts are on. */
export function alertsSubscriptionId(): number | null {
    return snapshot === 'on' && stored ? stored.subscriptionId : null
}

/** The API client to use; set once signed in (see useTimerAlerts). */
export function setAlertsApi(client: ApiClient | null) {
    api = client
}

export function alertsApi(): ApiClient | null {
    return api
}

function keyBytes(base64url: string) {
    const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
    const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
    if (!a) return false
    const x = new Uint8Array(a)
    return x.length === b.length && x.every((v, i) => v === b[i])
}

/** Subscribes (or re-subscribes) this device and registers it with soupi. */
async function register(client: ApiClient): Promise<AlertsState> {
    const { publicKey } = await client.get<{ publicKey: string | null }>('/push/config')
    if (!publicKey) {
        serverOff = true
        emit()
        return snapshot
    }
    const key = keyBytes(publicKey)
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    // A subscription made with another key (e.g. after a key rotation) can't be used.
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
        await sub.unsubscribe().catch(() => {})
        sub = null
    }
    if (!sub)
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    const { id } = await client.put<{ id: number }>('/push/subscription', sub.toJSON())
    writeStored({ endpoint: sub.endpoint, subscriptionId: id })
    return snapshot
}

/**
 * Turns alerts on. Call it from a tap: iOS shows the permission prompt only in
 * response to one, so the permission request must come first.
 */
export async function enableAlerts(client: ApiClient | null = api): Promise<AlertsState> {
    const state = computeState()
    if (state === 'needs-home-screen' || state === 'unsupported' || state === 'blocked')
        return state
    const permission =
        Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission
    if (permission !== 'granted' || !client) {
        emit()
        return snapshot
    }
    return register(client)
}

let refreshing: Promise<void> | null = null

/** On start-up: keep this device's registration current, or clear it if
 *  notifications were turned off in the browser meanwhile. Without a
 *  registration, just learn whether the server has push on. */
export function refreshAlerts(client: ApiClient): Promise<void> {
    refreshing ??= (async () => {
        if (!pushSupported()) return
        if (stored && Notification.permission !== 'granted') {
            writeStored(null)
            return
        }
        if (stored) {
            await register(client)
            return
        }
        const { publicKey } = await client.get<{ publicKey: string | null }>('/push/config')
        serverOff = !publicKey
        emit()
    })().finally(() => {
        refreshing = null
    })
    return refreshing
}

/** Turns alerts off for this device (also on sign-out). */
export async function disableAlerts(client: ApiClient | null = api) {
    const endpoint = stored?.endpoint
    writeStored(null)
    if (!pushSupported()) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    await sub?.unsubscribe().catch(() => {})
    if (client && endpoint) {
        await client
            .request<void>('DELETE', '/push/subscription', { body: { endpoint } })
            .catch(() => {})
    }
}
