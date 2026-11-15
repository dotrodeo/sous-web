import { useState } from 'react'
import { BellIcon } from './Icons'
import { useAlertsState } from '../hooks/useTimerAlerts'
import { disableAlerts, enableAlerts } from '../lib/push'
import { registerRunningAlerts } from '../lib/timers'

const DESCRIPTION = {
    on: 'cooking timers alert this device, even when sous is closed.',
    off: 'get an alert on this device when a cooking timer ends, even when sous is closed.',
    blocked: 'notifications are blocked. allow them for sous in your browser’s settings.',
    'needs-home-screen':
        'add sous to your home screen (share → add to home screen), then turn this on there.',
    unsupported: 'not available in this browser. timers still ring while sous is open.',
} as const

/** Settings row: this device's timer alerts (web push, #22). */
export function TimerAlertsRow() {
    const state = useAlertsState()
    const [busy, setBusy] = useState(false)
    const [failed, setFailed] = useState(false)

    const toggle = async () => {
        setBusy(true)
        setFailed(false)
        try {
            if (state === 'on') {
                await disableAlerts()
            } else if ((await enableAlerts()) === 'on') {
                registerRunningAlerts()
            }
        } catch {
            setFailed(true)
        } finally {
            setBusy(false)
        }
    }

    const canToggle = state === 'on' || state === 'off'

    return (
        <div className="settings-row timer-alerts">
            <span className="icon">
                <BellIcon size={22} />
            </span>
            <span className="text">
                <span className="label">timer alerts</span>
                <span className="desc">
                    {failed ? 'couldn’t turn alerts on. try again.' : DESCRIPTION[state]}
                </span>
            </span>
            {canToggle && (
                <button
                    type="button"
                    role="switch"
                    aria-checked={state === 'on'}
                    aria-label="timer alerts"
                    className="switch-btn"
                    disabled={busy}
                    onClick={toggle}
                >
                    <span className={`switch${state === 'on' ? ' on' : ''}`}>
                        <span className="knob" />
                    </span>
                </button>
            )}
        </div>
    )
}
