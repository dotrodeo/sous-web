// App-wide cooking timers. Each timer counts down from a fixed end time, so the
// display stays correct even when the browser throttles a background tab. When a
// timer ends while Sous is running it rings the alarm (looping until stopped) and
// vibrates where supported.
//
// Timers are kept in localStorage, so they survive a reload or iOS closing the
// app in the background. With timer alerts on (lib/push.ts), each running timer
// is also registered with soupi, which pushes an alert to this device when it
// ends, even if Sous is closed.
import { alertsApi, alertsSubscriptionId, enableAlerts, getAlertsState } from './push'

export interface Timer {
    id: string
    /** Identifies what started it, so tapping the same time twice doesn't double up. */
    key: string
    /** Short label, e.g. "step 3 · 25 min". */
    label: string
    /** Where it came from, e.g. the recipe name. */
    detail: string
    /** The recipe it belongs to; tapping the alert opens it. */
    recipeId?: number
    endsAt: number
    done: boolean
    /** Set while paused: the time that was left. `endsAt` is stale until resumed. */
    pausedRemainingMs?: number | null
}

/** Paused timers don't count down, ring or alert. */
export function isPaused(t: Timer): boolean {
    return t.pausedRemainingMs != null
}

/** Time left now: the frozen remainder while paused. */
export function remainingMs(t: Timer, now = Date.now()): number {
    return isPaused(t) ? t.pausedRemainingMs! : t.endsAt - now
}

/** Running: not finished and not paused. */
const running = (t: Timer) => !t.done && !isPaused(t)

const STORAGE_KEY = 'sous-timers'
/** Timers that ended longer ago than this aren't restored on load. */
const FORGET_AFTER_MS = 60 * 60 * 1000
/** A timer noticed as ended later than this, with alerts on, already had its alert
 *  (the push); don't start the alarm on top of it. */
const LATE_RING_MS = 15_000

let timers: Timer[] = loadTimers()
const listeners = new Set<() => void>()
let tick: number | undefined

function loadTimers(): Timer[] {
    if (typeof localStorage === 'undefined') return []
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Timer[]
        const cutoff = Date.now() - FORGET_AFTER_MS
        // Paused timers stay however long ago their stale end time was.
        return Array.isArray(saved)
            ? saved.filter((t) => t && (isPaused(t) || t.endsAt > cutoff))
            : []
    } catch {
        return []
    }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
    } catch {
        /* storage full or unavailable: timers still run until the page reloads */
    }
}

function emit() {
    save()
    listeners.forEach((l) => l())
}

export function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function getTimers(): Timer[] {
    return timers
}

// --- alarm ---------------------------------------------------------------

let alarm: HTMLAudioElement | null = null
let alarmUnlocked = false

function alarmAudio(): HTMLAudioElement {
    if (!alarm) {
        alarm = new Audio('/sounds/alarm.mp3')
        alarm.loop = true
        alarm.preload = 'auto'
    }
    return alarm
}

/** Must run during a tap: browsers (iOS especially) only allow sound after one. */
function unlockAlarm() {
    const a = alarmAudio()
    if (alarmUnlocked) return
    a.muted = true
    a.play()
        .then(() => {
            a.pause()
            a.currentTime = 0
            alarmUnlocked = true
        })
        .catch(() => {})
        .finally(() => {
            a.muted = false
        })
}

function ringAlarm() {
    const a = alarmAudio()
    a.currentTime = 0
    a.play().catch(() => {})
}

function silenceAlarm() {
    if (!alarm) return
    alarm.pause()
    alarm.currentTime = 0
}

// --- push alerts (soupi) -------------------------------------------------

/** Registers (or re-registers) a running timer for a push alert. */
function registerAlert(t: Timer) {
    const api = alertsApi()
    const subscriptionId = alertsSubscriptionId()
    if (!api || subscriptionId == null) return
    api.put(`/timers/${t.id}`, {
        subscriptionId,
        remainingMs: Math.max(1000, t.endsAt - Date.now()),
        label: t.label,
        detail: t.detail,
        recipeId: t.recipeId ?? null,
    }).catch(() => {})
}

/** Cancels a timer's push alert (stopped, or already rung in the page). */
function cancelAlert(id: string) {
    const api = alertsApi()
    if (!api || alertsSubscriptionId() == null) return
    api.request<void>('DELETE', `/timers/${id}`, { keepalive: true }).catch(() => {})
}

/** Registers every running timer; call when alerts turn on or the app starts. */
export function registerRunningAlerts() {
    timers.filter((t) => running(t) && t.endsAt > Date.now()).forEach(registerAlert)
}

// --- in-page notifications (when push alerts are off) ---------------------

function askNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
    }
}

async function notify(timer: Timer) {
    if (document.visibilityState === 'visible') return
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const title = `timer done: ${timer.label}`
    const options = { body: timer.detail, tag: timer.id, icon: '/icons/icon-192.png' }
    try {
        // The installed app (and Android) only allows notifications via the service worker.
        const reg = await navigator.serviceWorker?.getRegistration()
        if (reg) await reg.showNotification(title, options)
        else new Notification(title, options)
    } catch {
        /* notifications unavailable */
    }
}

// --- ticking -------------------------------------------------------------

function check() {
    const now = Date.now()
    const pushOn = alertsSubscriptionId() != null
    const visible = document.visibilityState === 'visible'
    let changed = false
    timers = timers.map((t) => {
        if (!running(t) || t.endsAt > now) return t
        changed = true
        const finished = { ...t, done: true }
        if (pushOn && now - t.endsAt > LATE_RING_MS) return finished // the push alerted
        ringAlarm()
        navigator.vibrate?.([400, 200, 400, 200, 400])
        if (pushOn) {
            // On screen: the alarm is the alert, so stop the push. In the background
            // (desktop tab), let the push show the notification.
            if (visible) cancelAlert(t.id)
        } else {
            void notify(finished)
        }
        return finished
    })
    if (!timers.some(running) && tick !== undefined) {
        window.clearInterval(tick)
        tick = undefined
    }
    if (changed) emit()
}

function startTicking() {
    if (tick === undefined && timers.some(running)) tick = window.setInterval(check, 500)
}

/** Timers restored after a reload had no tap to unlock sound; the next tap
 *  anywhere does it, so they can still ring. */
function unlockAlarmOnNextTap() {
    if (alarmUnlocked || !timers.some(running)) return
    document.addEventListener('pointerdown', unlockAlarm, { capture: true, once: true })
}

if (typeof document !== 'undefined') {
    // Background tabs check rarely; catch up as soon as the page is visible again.
    document.addEventListener('visibilitychange', check)
    startTicking()
    unlockAlarmOnNextTap()
}

export function startTimer({
    key,
    label,
    detail,
    seconds,
    recipeId,
}: {
    key: string
    label: string
    detail: string
    seconds: number
    recipeId?: number
}) {
    unlockAlarm()
    if (timers.some((t) => t.key === key && !t.done)) return
    const timer: Timer = {
        id: crypto.randomUUID(),
        key,
        label,
        detail,
        recipeId,
        endsAt: Date.now() + seconds * 1000,
        done: false,
    }
    timers = [...timers, timer]
    if (alertsSubscriptionId() != null) {
        registerAlert(timer)
    } else if (getAlertsState() === 'off' && alertsApi()) {
        // First timer: turn alerts on. This runs in the tap, which iOS needs to
        // show the permission prompt; once subscribed, register what's running.
        void enableAlerts()
            .then((state) => {
                if (state === 'on') registerRunningAlerts()
            })
            .catch(() => {})
    } else {
        askNotificationPermission()
    }
    startTicking()
    emit()
}

/** Removes a timer: cancels it if running, or dismisses it (and its alarm) if done. */
export function stopTimer(id: string) {
    const timer = timers.find((t) => t.id === id)
    if (timer && running(timer)) cancelAlert(id)
    timers = timers.filter((t) => t.id !== id)
    if (!timers.some((t) => t.done)) silenceAlarm()
    emit()
}

function update(id: string, change: (t: Timer) => Timer) {
    timers = timers.map((t) => (t.id === id ? change(t) : t))
}

/**
 * Adds a minute. A finished timer runs again for one more minute (and its alarm
 * stops); a paused one keeps the extra minute for when it resumes.
 */
export function addMinute(id: string) {
    const timer = timers.find((t) => t.id === id)
    if (!timer) return
    unlockAlarm()
    if (isPaused(timer)) {
        update(id, (t) => ({ ...t, pausedRemainingMs: t.pausedRemainingMs! + 60_000 }))
    } else if (timer.done) {
        update(id, (t) => ({ ...t, done: false, endsAt: Date.now() + 60_000 }))
        if (!timers.some((t) => t.done)) silenceAlarm()
    } else {
        update(id, (t) => ({ ...t, endsAt: t.endsAt + 60_000 }))
    }
    const changed = timers.find((t) => t.id === id)!
    if (running(changed)) registerAlert(changed)
    startTicking()
    emit()
}

/** Freezes a running timer and cancels its push alert. */
export function pauseTimer(id: string) {
    const timer = timers.find((t) => t.id === id)
    if (!timer || !running(timer)) return
    update(id, (t) => ({ ...t, pausedRemainingMs: Math.max(0, t.endsAt - Date.now()) }))
    cancelAlert(id)
    emit()
}

/** Carries on from the time that was left, and alerts again. */
export function resumeTimer(id: string) {
    const timer = timers.find((t) => t.id === id)
    if (!timer || !isPaused(timer)) return
    unlockAlarm()
    update(id, (t) => ({
        ...t,
        endsAt: Date.now() + t.pausedRemainingMs!,
        pausedRemainingMs: null,
    }))
    registerAlert(timers.find((t) => t.id === id)!)
    startTicking()
    emit()
}

/** Clears every timer on this device (on sign-out). */
export function clearTimers() {
    timers = []
    silenceAlarm()
    emit()
}

/** A timer's length for its label: "45 sec", "10 min", "1 hr 30 min". */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} sec`
    const h = Math.floor(seconds / 3600)
    const m = Math.round((seconds % 3600) / 60)
    if (!h) return `${m} min`
    return m ? `${h} hr ${m} min` : `${h} hr`
}

/** "9:41", or "1:05:00" from an hour up. */
export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = String(total % 60).padStart(2, '0')
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
