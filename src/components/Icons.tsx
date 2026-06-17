// Icons from the design handoff — exact SVG paths, rounded 2px line style on a
// 24px grid, stroke = currentColor. The logo mark uses the brand/accent tokens.
import type { CSSProperties } from 'react'

interface IconProps {
    size?: number
    className?: string
    style?: CSSProperties
}

function Svg({ size = 24, className, style, children }: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            aria-hidden="true"
        >
            {children}
        </svg>
    )
}

export const RecipesIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z" />
        <path d="M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z" />
    </Svg>
)
export const PlanIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" />
    </Svg>
)
export const PantryIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <path d="M6 10h12M9 6v1M9 13v2" />
    </Svg>
)
export const ListIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M1 2h3l2.6 13.4a1.5 1.5 0 0 0 1.5 1.2h9a1.5 1.5 0 0 0 1.5-1.2L22 6H5" />
    </Svg>
)
export const SettingsIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </Svg>
)
export const PlusIcon = (p: IconProps) => (
    <Svg {...p} style={{ ...p.style }}>
        <path d="M12 5v14M5 12h14" />
    </Svg>
)
export const SearchIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </Svg>
)
export const CheckIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M20 6 9 17l-5-5" />
    </Svg>
)
export const ChevronRightIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="m9 6 6 6-6 6" />
    </Svg>
)
export const EyeIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
    </Svg>
)
export const EyeOffIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M16.7 16.7A9 9 0 0 1 12 18c-5 0-9-6-9-6a16 16 0 0 1 4.1-4.6m3.5-1.2A9 9 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.3 3" />
    </Svg>
)
export const ChevronLeftIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="m15 18-6-6 6-6" />
    </Svg>
)
export const CookIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M5 10h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
        <path d="M3 10h18" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </Svg>
)
export const EditIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
)
export const TrashIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6M14 11v6" />
    </Svg>
)
export const XIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
)
export const LinkIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M9 17H7A5 5 0 0 1 7 7h2" />
        <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
        <path d="M8 12h8" />
    </Svg>
)
export const AlertCircleIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16v.5" />
    </Svg>
)
export const ThumbUpIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
        <path d="M7 10l4-7a2.5 2.5 0 0 1 2.5 3.2L12.5 9H19a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.6 20H7" />
    </Svg>
)
export const ThumbDownIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1z" />
        <path d="M17 14l-4 7a2.5 2.5 0 0 1-2.5-3.2L11.5 15H5a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6.4 4H17" />
    </Svg>
)

export const ChevronDownIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="m6 9 6 6 6-6" />
    </Svg>
)
export const ChevronUpIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="m6 15 6-6 6 6" />
    </Svg>
)
/** Two-arrow refresh loop — the pantry "restock / staple" toggle. */
export const RestockIcon = (p: IconProps) => (
    <Svg {...p}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
)
/** Circle-minus — remove an item from the shopping list (keeps it in the catalog). */
export const MinusCircleIcon = (p: IconProps) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
    </Svg>
)
/** Calendar with an alert tick — "expiring soon" badge. */
export const CalendarAlertIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" />
        <path d="M12 12v3M12 18.5v.5" />
    </Svg>
)

/** Calendar with a plus — "add a date" / schedule-to-plan affordance. */
export const CalendarPlusIcon = (p: IconProps) => (
    <Svg {...p}>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" />
        <path d="M12 13v4M10 15h4" />
    </Svg>
)

/** Three-dot "more" glyph — filled circles, not a stroke icon. */
export const MoreIcon = ({ size = 22, className, style }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        className={className}
        style={style}
        aria-hidden="true"
    >
        <circle cx="5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="19" cy="12" r="1.7" />
    </svg>
)

/** The sous mark (sunflower squircle + cobalt "s"). */
export function Logo({ size = 40 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ flex: 'none' }}
            aria-hidden="true"
        >
            <rect x="2" y="2" width="96" height="96" rx="26" style={{ fill: 'var(--brand)' }} />
            <path
                d="M68 37 C68 25 34 24 34 40 C34 53 67 49 67 61 C67 78 31 77 32 63"
                style={{ fill: 'none', stroke: 'var(--accent)' }}
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/** Brand glyphs for social sign-in (full color, not currentColor). */
export const GoogleGlyph = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="#4285F4"
            d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9Z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.2 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z"
        />
        <path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8L6 14.3Z" />
        <path
            fill="#EA4335"
            d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.7 6-4.7Z"
        />
    </svg>
)
export const AppleGlyph = ({ size = 19 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8Zm-2.3-7c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.8-1.2Z" />
    </svg>
)
