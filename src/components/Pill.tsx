interface PillProps {
    label: string
    active?: boolean
    onClick?: () => void
}

/** Toggleable filter pill (Pill.swift): filled p_primary when active. */
export function Pill({ label, active, onClick }: PillProps) {
    return (
        <button type="button" className={`pill${active ? ' pill-active' : ''}`} onClick={onClick}>
            {label}
        </button>
    )
}
