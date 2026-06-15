// Minimal line-icon set (stroke = currentColor) approximating the SF Symbols
// used in the native tab bar and toolbars. Phase 5 can swap in a richer set.

interface IconProps {
  size?: number
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

export function BookIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 5a2 2 0 0 1 2-2h9v16H6a2 2 0 0 0-2 2z" />
      <path d="M15 3h3a1 1 0 0 1 1 1v15H6" />
    </svg>
  )
}

export function CalendarIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function FridgeIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 10h12M9 5v2M9 13v3" />
    </svg>
  )
}

export function CartIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2l2.5 13h11l2-9H6" />
    </svg>
  )
}

export function GearIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function PlusIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TrashIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 24 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  )
}
