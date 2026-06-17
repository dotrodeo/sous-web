import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Logo, RecipesIcon, PlanIcon, PantryIcon, ListIcon, SettingsIcon } from './Icons'

const NAV = [
    { to: '/recipes', label: 'recipes', Icon: RecipesIcon },
    { to: '/plan', label: 'plan', Icon: PlanIcon },
    { to: '/pantry', label: 'pantry', Icon: PantryIcon },
    { to: '/list', label: 'list', Icon: ListIcon },
    { to: '/settings', label: 'settings', Icon: SettingsIcon },
]

/** Responsive shell: desktop 248px sidebar ↔ mobile floating bottom nav. */
export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <Logo size={30} />
                    sous
                </div>
                {NAV.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <Icon size={22} />
                        {label}
                    </NavLink>
                ))}
            </aside>

            <div className="main">{children}</div>

            <nav className="bottom-nav">
                {NAV.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
                    >
                        <Icon size={24} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
