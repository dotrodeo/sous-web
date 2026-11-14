import { XIcon } from './Icons'
import { useNow, useTimers } from '../hooks/useTimers'
import { formatRemaining, stopTimer } from '../lib/timers'

const ENDING_MS = 60_000

/** Running and finished timers, pinned to the top of the screen everywhere. */
export function TimersDock() {
    const timers = useTimers()
    const now = useNow(timers.length > 0)
    if (timers.length === 0) return null

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
        </div>
    )
}
