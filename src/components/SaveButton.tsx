import { useEffect, useRef, useState, type Ref } from 'react'
import { CheckIcon } from './Icons'

/** How long the green check shows before onSaved runs (closing a sheet, opening a recipe). */
const SAVED_HOLD_MS = 700

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SaveButtonProps<T> {
    /** Performs the save, e.g. () => mutation.mutateAsync(patch). Rejecting shows the error state. */
    onSave: () => Promise<T>
    /** Runs after the saved check has shown, with onSave's result. */
    onSaved?: (result: T) => void
    /** The save isn't possible yet (e.g. a required field is empty). */
    disabled?: boolean
    label?: string
    className?: string
    ref?: Ref<HTMLButtonElement>
}

/**
 * The app's one save button. Idle → saving (a rainbow ring runs around the edge;
 * further clicks are ignored) → saved (a green check, then onSaved) → idle, or
 * error ("retry") if onSave rejects. The state is announced to screen readers.
 */
export function SaveButton<T>({
    onSave,
    onSaved,
    disabled = false,
    label = 'save',
    className,
    ref,
}: SaveButtonProps<T>) {
    const [state, setState] = useState<SaveState>('idle')
    const mounted = useRef(true)
    const timer = useRef<number | undefined>(undefined)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
            window.clearTimeout(timer.current)
        }
    }, [])

    const run = async () => {
        if (disabled || state === 'saving' || state === 'saved') return
        setState('saving')
        try {
            const result = await onSave()
            if (!mounted.current) return
            setState('saved')
            timer.current = window.setTimeout(() => {
                if (!mounted.current) return
                setState('idle')
                onSaved?.(result)
            }, SAVED_HOLD_MS)
        } catch {
            if (mounted.current) setState('error')
        }
    }

    const shown = state === 'idle' && disabled ? 'disabled' : state
    const busy = state === 'saving' || state === 'saved'

    return (
        <>
            <button
                ref={ref}
                type="button"
                className={className ? `save-btn ${className}` : 'save-btn'}
                data-state={shown}
                disabled={disabled && !busy}
                aria-disabled={busy || undefined}
                onClick={run}
            >
                <span className="save-btn-label">{state === 'error' ? 'retry' : label}</span>
                <span className="save-btn-check" aria-hidden="true">
                    <CheckIcon size={20} />
                </span>
            </button>
            <span className="visually-hidden" role="status" aria-live="polite">
                {state === 'saving'
                    ? 'saving…'
                    : state === 'saved'
                      ? 'saved'
                      : state === 'error'
                        ? 'save failed'
                        : ''}
            </span>
        </>
    )
}
