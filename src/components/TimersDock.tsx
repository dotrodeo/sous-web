import { useEffect, useRef, useState } from 'react'
import { XIcon } from './Icons'
import { useNow, useTimers } from '../hooks/useTimers'
import { useAlertsState } from '../hooks/useTimerAlerts'
import {
    addMinute,
    formatRemaining,
    isPaused,
    pauseTimer,
    remainingMs,
    resumeTimer,
    stopTimer,
} from '../lib/timers'

const ENDING_MS = 60_000
const HINT_KEY = 'sous-alerts-hint-dismissed'

function hintDismissed() {
    try {
        return localStorage.getItem(HINT_KEY) === '1'
    } catch {
        return true
    }
}

/**
 * Running and finished timers, pinned to the top of the screen everywhere. Tap a
 * timer to show its controls: +1 min, and pause or resume (#42).
 */
export function TimersDock() {
    const timers = useTimers()
    const now = useNow(timers.some((t) => !t.done && !isPaused(t)))
    const alerts = useAlertsState()
    const [hideHint, setHideHint] = useState(hintDismissed)
    const [openId, setOpenId] = useState<string | null>(null)
    const dock = useRef<HTMLDivElement>(null)

    // A tap anywhere outside the dock collapses an open timer.
    useEffect(() => {
        if (!openId) return
        const close = (e: PointerEvent) => {
            if (!dock.current?.contains(e.target as Node)) setOpenId(null)
        }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
    }, [openId])

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
        <div className="timers-dock" aria-label="timers" ref={dock}>
            {timers.map((t) => {
                const paused = isPaused(t)
                const remaining = remainingMs(t, now)
                const open = openId === t.id
                const state = t.done
                    ? ' done'
                    : paused
                      ? ' paused'
                      : remaining <= ENDING_MS
                        ? ' ending'
                        : ''
                const time = t.done ? 'done' : formatRemaining(remaining)
                return (
                    <div
                        key={t.id}
                        className={`timer-chip${state}${open ? ' open' : ''}`}
                        title={t.detail}
                        role={t.done ? 'alert' : undefined}
                    >
                        <div className="timer-row">
                            <button
                                type="button"
                                className="timer-main"
                                aria-expanded={open}
                                aria-label={`${t.label} timer, ${paused ? `paused at ${time}` : time}: ${open ? 'hide' : 'show'} controls`}
                                onClick={() => setOpenId(open ? null : t.id)}
                            >
                                <span className="timer-time">{time}</span>
                                <span className="timer-label">
                                    {paused ? `paused · ${t.label}` : t.label}
                                </span>
                            </button>
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
                        {open && (
                            <div className="timer-actions">
                                <button
                                    type="button"
                                    className="timer-action"
                                    onClick={() => addMinute(t.id)}
                                >
                                    +1 min
                                </button>
                                {!t.done && (
                                    <button
                                        type="button"
                                        className="timer-action"
                                        onClick={() =>
                                            paused ? resumeTimer(t.id) : pauseTimer(t.id)
                                        }
                                    >
                                        {paused ? 'resume' : 'pause'}
                                    </button>
                                )}
                            </div>
                        )}
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
