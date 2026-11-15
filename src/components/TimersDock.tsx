import { useState } from 'react'
import { XIcon } from './Icons'
import { useNow, useTimers } from '../hooks/useTimers'
import { useAlertsState } from '../hooks/useTimerAlerts'
import { formatRemaining, stopTimer } from '../lib/timers'

const ENDING_MS = 60_000
const HINT_KEY = 'sous-alerts-hint-dismissed'

function hintDismissed() {
    try {
        return localStorage.getItem(HINT_KEY) === '1'
    } catch {
        return true
    }
}

/** Running and finished timers, pinned to the top of the screen everywhere. */
export function TimersDock() {
    const timers = useTimers()
    const now = useNow(timers.length > 0)
    const alerts = useAlertsState()
    const [hideHint, setHideHint] = useState(hintDismissed)
    if (timers.length === 0) return null

    // iPhone/iPad in a browser tab: timers can't alert once Sous is closed. Say so
    // once, while a timer is running.
    const showHint = alerts === 'needs-home-screen' && !hideHint && timers.some((t) => !t.done)
    const dismissHint = () => {
        setHideHint(true)
        try {
            localStorage.setItem(HINT_KEY, '1')
        } catch {
            /* ignore */
        }
    }

    return (
        <div className="timers-dock" aria-label="timers">
            {timers.map((t) => {
                const remaining = t.endsAt - now
                const state = t.done ? ' done' : remaining <= ENDING_MS ? ' ending' : ''
                return (
                    <div
                        key={t.id}
                        className={`timer-chip${state}`}
                        title={t.detail}
                        role={t.done ? 'alert' : undefined}
                    >
                        <span className="timer-time">
                            {t.done ? 'done' : formatRemaining(remaining)}
                        </span>
                        <span className="timer-label">{t.label}</span>
                        <button
                            type="button"
                            className="timer-stop"
                            aria-label={
                                t.done ? `dismiss ${t.label} timer` : `stop ${t.label} timer`
                            }
                            onClick={() => stopTimer(t.id)}
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                )
            })}
            {showHint && (
                <div className="timer-hint" role="note">
                    <span>
                        keep sous open for the alarm, or add it to your home screen to get alerts
                        when it’s closed.
                    </span>
                    <button
                        type="button"
                        className="timer-stop"
                        aria-label="dismiss"
                        onClick={dismissHint}
                    >
                        <XIcon size={16} />
                    </button>
                </div>
            )}
        </div>
    )
}
