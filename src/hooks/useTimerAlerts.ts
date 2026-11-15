import { useEffect, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../lib/useApi'
import { getAlertsState, refreshAlerts, setAlertsApi, subscribeAlerts } from '../lib/push'
import { registerRunningAlerts } from '../lib/timers'

/** This device's timer alerts state ('on', 'off', 'blocked', …). */
export function useAlertsState() {
    return useSyncExternalStore(subscribeAlerts, getAlertsState)
}

/**
 * Signed-in setup for timer alerts: gives lib/push the API client, keeps this
 * device's registration and running timers current at soupi, and opens the page a
 * tapped notification points to.
 */
export function useTimerAlerts() {
    const api = useApi()
    const navigate = useNavigate()

    useEffect(() => {
        setAlertsApi(api)
        refreshAlerts(api)
            .catch(() => {})
            .finally(() => registerRunningAlerts())
        return () => setAlertsApi(null)
    }, [api])

    useEffect(() => {
        const sw = navigator.serviceWorker
        if (!sw) return
        const onMessage = (e: MessageEvent) => {
            if (e.data?.type === 'sous:navigate' && typeof e.data.path === 'string') {
                navigate(e.data.path)
            }
        }
        sw.addEventListener('message', onMessage)
        return () => sw.removeEventListener('message', onMessage)
    }, [navigate])
}
