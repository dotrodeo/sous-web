import { SignedIn, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useHouseholdEvents } from './hooks/useHouseholdEvents'
import { LoginPage } from './pages/LoginPage'
import { RecipesPage, PlanPage, PantryPage, ListPage, SettingsPage } from './pages/Placeholders'
import './ui.css'

/** Lives inside <SignedIn> so the SSE stream only runs when authenticated. */
function HouseholdEventsListener() {
    useHouseholdEvents()
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
                <AppShell>
                    <Routes>
                        <Route index element={<Navigate to="/recipes" replace />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/plan" element={<PlanPage />} />
                        <Route path="/pantry" element={<PantryPage />} />
                        <Route path="/list" element={<ListPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
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
