import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { RecipesPage } from './RecipesPage'
import './App.css'

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
        <RecipesPage />
      </SignedIn>
    </div>
  )
}

export default App
