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
        const id = window.setInterval(() => setNow(Date.now()), ms)
        return () => window.clearInterval(id)
    }, [active, ms])
    return now
}
