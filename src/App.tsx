import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { useHouseholdEvents } from './hooks/useHouseholdEvents'
import { RecipesListPage } from './pages/RecipesListPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { BigModePage } from './pages/BigModePage'
import { PantryPage } from './pages/PantryPage'
import { ListPage, PlanPage, ProfilePage } from './pages/PlaceholderPages'
import './ui.css'

/** Lives inside <SignedIn> so the SSE stream only runs when authenticated. */
function HouseholdEventsListener() {
  useHouseholdEvents()
  return null
}

/** Tabbed shell: scrolling content area above a fixed bottom tab bar. */
function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}

function App() {
  return (
    <>
      <SignedOut>
        <div className="signin">
          <span className="brand-mark">sous</span>
          <p>Sign in to view your household’s recipes.</p>
          <SignInButton mode="modal">
            <button className="primary" type="button">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <HouseholdEventsListener />
        <Routes>
          {/* Immersive cooking view has no tab bar. */}
          <Route path="/recipes/:id/cook" element={<BigModePage />} />
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<RecipesListPage />} />
            <Route path="/recipes/new" element={<RecipeEditPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/settings" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/recipes" replace />} />
          </Route>
        </Routes>
      </SignedIn>
    </>
  )
}

export default App
