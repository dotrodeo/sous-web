import { useEffect } from 'react'

/** Keeps the screen on while `active`, where the browser supports it. */
export function useWakeLock(active: boolean) {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return
        let lock: WakeLockSentinel | null = null
        let cancelled = false
        const acquire = () => {
            navigator.wakeLock
                .request('screen')
                .then((l) => {
                    if (cancelled) l.release().catch(() => {})
                    else lock = l
                })
                .catch(() => {})
        }
        // The browser drops the lock when the page is hidden; take it again on return.
        const onVisible = () => {
            if (document.visibilityState === 'visible') acquire()
        }
        acquire()
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVisible)
            lock?.release().catch(() => {})
        }
    }, [active])
}
