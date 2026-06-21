import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'

interface BottomSheetProps {
    /** Dismiss the sheet (scrim tap, Escape, or swipe-down past the threshold). */
    onClose: () => void
    children: ReactNode
    /** Extra class on the sheet card (e.g. for a wider/taller variant). */
    className?: string
}

/** Distance the card must be dragged down before release dismisses it. */
const CLOSE_THRESHOLD = 90

/** Bottom sheet with a real swipe-to-close grabber, scrim tap, and Escape.
 *  Used for all add/edit sheets so the grabber affordance actually works. */
export function BottomSheet({ onClose, children, className }: BottomSheetProps) {
    const [dragY, setDragY] = useState(0)
    const startY = useRef<number | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const onPointerDown = (e: ReactPointerEvent) => {
        startY.current = e.clientY
        e.currentTarget.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: ReactPointerEvent) => {
        if (startY.current === null) return
        // Only follow downward drags; ignore upward pulls.
        setDragY(Math.max(0, e.clientY - startY.current))
    }
    const endDrag = () => {
        if (startY.current === null) return
        const shouldClose = dragY > CLOSE_THRESHOLD
        startY.current = null
        if (shouldClose) onClose()
        else setDragY(0)
    }

    return (
        <div className="sheet-overlay">
            <div className="modal-scrim" onClick={onClose} />
            <div
                className={`sheet-card${className ? ` ${className}` : ''}`}
                style={
                    dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined
                }
            >
                <button
                    type="button"
                    className="sheet-handle"
                    aria-label="close"
                    onClick={onClose}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                >
                    <span className="sheet-grabber" />
                </button>
                {children}
            </div>
        </div>
    )
}
