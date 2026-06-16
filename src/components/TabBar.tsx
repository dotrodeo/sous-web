import { NavLink } from 'react-router-dom'
import { BookIcon, CalendarIcon, FridgeIcon, CartIcon, GearIcon } from './Icons'

const TABS = [
    { to: '/recipes', label: 'recipes', Icon: BookIcon },
    { to: '/plan', label: 'plan', Icon: CalendarIcon },
    { to: '/pantry', label: 'pantry', Icon: FridgeIcon },
    { to: '/list', label: 'list', Icon: CartIcon },
    { to: '/settings', label: 'settings', Icon: GearIcon },
]

/** Bottom tab bar mirroring the native 5-tab layout (ContentView.swift). */
export function TabBar() {
    return (
        <nav className="tab-bar">
            {TABS.map(({ to, label, Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `tab${isActive ? ' tab-active' : ''}`}
                >
                    <Icon size={22} />
                    <span className="tab-label">{label}</span>
                </NavLink>
            ))}
        </nav>
    )
}
