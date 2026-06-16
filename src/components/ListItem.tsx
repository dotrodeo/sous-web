import type { ReactNode } from 'react'

interface ListItemProps {
    left?: ReactNode
    title: ReactNode
    subtitle?: ReactNode
    right?: ReactNode
    onClick?: () => void
}

/**
 * Generic row with optional left/right adornments (ListItem.swift). Rendered as
 * a div (not a button) so it can safely contain nested interactive elements.
 */
export function ListItem({ left, title, subtitle, right, onClick }: ListItemProps) {
    return (
        <div
            className={`list-item${onClick ? ' list-item-tappable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onClick()
                          }
                      }
                    : undefined
            }
        >
            {left != null && <span className="list-item-left">{left}</span>}
            <span className="list-item-body">
                <span className="list-item-title">{title}</span>
                {subtitle != null && <span className="list-item-subtitle">{subtitle}</span>}
            </span>
            {right != null && <span className="list-item-right">{right}</span>}
        </div>
    )
}
