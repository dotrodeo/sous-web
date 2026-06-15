import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { RecipesPage } from './RecipesPage'
import { useHouseholdEvents } from './hooks/useHouseholdEvents'
import './App.css'

/** Lives inside <SignedIn> so the SSE stream only runs when authenticated. */
function HouseholdEventsListener() {
  useHouseholdEvents()
  return null
}

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">sous</span>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      <SignedOut>
        <div className="signin">
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
        <RecipesPage />
      </SignedIn>
    </div>
  )
}

export default App
