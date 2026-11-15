import { SignedIn, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { TimersDock } from './components/TimersDock'
import { useHouseholdEvents } from './hooks/useHouseholdEvents'
import { useThemePreference } from './hooks/useTheme'
import { useTimerAlerts } from './hooks/useTimerAlerts'
import { LoginPage } from './pages/LoginPage'
import { RecipesPage } from './pages/RecipesPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { PantryPage } from './pages/PantryPage'
import { ListPage } from './pages/ListPage'
import { PlanPage } from './pages/PlanPage'
import { SettingsPage } from './pages/SettingsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import './ui.css'

/** Lives inside <SignedIn> so the SSE stream only runs when authenticated. */
function HouseholdEventsListener() {
    useHouseholdEvents()
    return null
}

/** Timer alerts by web push: registration, running timers, notification taps. */
function TimerAlertsSync() {
    useTimerAlerts()
    return null
}

/** Applies the signed-in user's saved theme. */
function ThemeSync() {
    useThemePreference()
    return null
}

function AuthedApp() {
    return (
        <>
            <SignedOut>
                <LoginPage />
            </SignedOut>
            <SignedIn>
                <HouseholdEventsListener />
                <ThemeSync />
                <TimerAlertsSync />
                <TimersDock />
                <AppShell>
                    <Routes>
                        <Route index element={<Navigate to="/recipes" replace />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/recipes/new" element={<RecipeEditPage />} />
                        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                        <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
                        <Route path="/plan" element={<PlanPage />} />
                        <Route path="/pantry" element={<PantryPage />} />
                        <Route path="/list" element={<ListPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/settings/categories" element={<CategoriesPage />} />
                        <Route path="*" element={<Navigate to="/recipes" replace />} />
                    </Routes>
                </AppShell>
            </SignedIn>
        </>
    )
}

function App() {
    return (
        <Routes>
            {/* OAuth (Google/Apple) lands here to finalize the redirect sign-in. */}
            <Route
                path="/sso-callback"
                element={
                    <AuthenticateWithRedirectCallback
                        signInForceRedirectUrl="/"
                        signUpForceRedirectUrl="/"
                    />
                }
            />
            <Route path="/*" element={<AuthedApp />} />
        </Routes>
    )
}

export default App
