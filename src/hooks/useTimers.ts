import { useEffect, useState, useSyncExternalStore } from 'react'
import { getTimers, subscribe } from '../lib/timers'

/** The running and finished timers, app-wide. */
export function useTimers() {
    return useSyncExternalStore(subscribe, getTimers)
}

/** The current time, refreshed every `ms` while `active`. */
export function useNow(active: boolean, ms = 250) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!active) return
        // Catch up at once: while inactive the time went stale (e.g. a finished
        // timer restarted with +1 min would briefly show a minute plus that gap).
        const first = window.setTimeout(() => setNow(Date.now()), 0)
        const id = window.setInterval(() => setNow(Date.now()), ms)
        return () => {
            window.clearTimeout(first)
            window.clearInterval(id)
        }
    }, [active, ms])
    return now
}
