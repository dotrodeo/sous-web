// App-wide cooking timers. Each timer counts down from a fixed end time, so the
// display stays correct even when the browser throttles a background tab. When a
// timer ends it rings the alarm (looping until stopped), vibrates where supported,
// and, if the page is in the background, shows a notification where allowed.

export interface Timer {
    id: string
    /** Identifies what started it, so tapping the same time twice doesn't double up. */
    key: string
    /** Short label, e.g. "step 3". */
    label: string
    /** Where it came from, e.g. the recipe name. */
    detail: string
    endsAt: number
    done: boolean
}

let timers: Timer[] = []
const listeners = new Set<() => void>()
let tick: number | undefined
let nextId = 1

function emit() {
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

/** Must run during a tap: browsers (iOS especially) only allow sound after one. */
function unlockAlarm() {
    if (!alarm) {
        alarm = new Audio('/sounds/alarm.mp3')
        alarm.loop = true
        alarm.preload = 'auto'
    }
    if (alarmUnlocked) return
    const a = alarm
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
    if (!alarm) return
    alarm.currentTime = 0
    alarm.play().catch(() => {})
}

function silenceAlarm() {
    if (!alarm) return
    alarm.pause()
    alarm.currentTime = 0
}

// --- notifications -------------------------------------------------------

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
    let changed = false
    timers = timers.map((t) => {
        if (t.done || t.endsAt > now) return t
        changed = true
        const finished = { ...t, done: true }
        ringAlarm()
        navigator.vibrate?.([400, 200, 400, 200, 400])
        void notify(finished)
        return finished
    })
    if (!timers.some((t) => !t.done) && tick !== undefined) {
        window.clearInterval(tick)
        tick = undefined
    }
    if (changed) emit()
}

if (typeof document !== 'undefined') {
    // Background tabs check rarely; catch up as soon as the page is visible again.
    document.addEventListener('visibilitychange', check)
}

export function startTimer({
    key,
    label,
    detail,
    seconds,
}: {
    key: string
    label: string
    detail: string
    seconds: number
}) {
    unlockAlarm()
    askNotificationPermission()
    if (timers.some((t) => t.key === key && !t.done)) return
    timers = [
        ...timers,
        {
            id: `timer-${nextId++}`,
            key,
            label,
            detail,
            endsAt: Date.now() + seconds * 1000,
            done: false,
        },
    ]
    if (tick === undefined) tick = window.setInterval(check, 500)
    emit()
}

/** Removes a timer: cancels it if running, or dismisses it (and its alarm) if done. */
export function stopTimer(id: string) {
    timers = timers.filter((t) => t.id !== id)
    if (!timers.some((t) => t.done)) silenceAlarm()
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
