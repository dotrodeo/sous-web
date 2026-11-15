import type { MouseEvent, ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Logo, RecipesIcon, PlanIcon, PantryIcon, ListIcon, SettingsIcon } from './Icons'
import { useUser, useActiveHousehold } from '../hooks/useUser'
import { initials } from '../lib/initials'

const NAV = [
    { to: '/recipes', label: 'recipes', Icon: RecipesIcon },
    { to: '/plan', label: 'plan', Icon: PlanIcon },
    { to: '/pantry', label: 'pantry', Icon: PantryIcon },
    { to: '/list', label: 'list', Icon: ListIcon },
    { to: '/settings', label: 'settings', Icon: SettingsIcon },
]

/** Responsive shell: desktop 248px sidebar ↔ mobile floating bottom nav. */
export function AppShell({ children }: { children: ReactNode }) {
    const { data: user } = useUser()
    const household = useActiveHousehold()
    const { pathname } = useLocation()

    // Tapping the tab for the page you're on scrolls it back to the top. From a
    // sub-page (e.g. a recipe under "recipes") the tab still navigates to its root.
    const scrollTopIfCurrent = (to: string) => (e: MouseEvent) => {
        if (pathname !== to) return
        e.preventDefault()
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }

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
                        onClick={scrollTopIfCurrent(to)}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <Icon size={22} />
                        {label}
                    </NavLink>
                ))}
                <div className="sidebar-spacer" />
                <NavLink
                    to="/settings"
                    onClick={scrollTopIfCurrent('/settings')}
                    className="sidebar-user"
                >
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                        {initials(user?.name, user?.email)}
                    </div>
                    <div className="meta">
                        <div className="name">{user?.name || user?.email || 'you'}</div>
                        {household && <div className="sub">{household.name}</div>}
                    </div>
                </NavLink>
            </aside>

            <div className="main">{children}</div>

            <nav className="bottom-nav">
                {NAV.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={scrollTopIfCurrent(to)}
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
