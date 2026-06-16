import { UserButton } from '@clerk/clerk-react'
import { Screen } from '../components/Screen'
import { useActiveHousehold } from '../hooks/useUser'

/** Stub tabs — built out in later Phase 4 slices (Pantry → List → Plan). */
function ComingSoon({ title }: { title: string }) {
  return (
    <Screen title={title}>
      <p className="empty-state">Coming soon — this tab is part of a later migration slice.</p>
    </Screen>
  )
}

export function PlanPage() {
  return <ComingSoon title="plan" />
}

export function ProfilePage() {
  const household = useActiveHousehold()
  return (
    <Screen title="settings" right={<UserButton />}>
      <div className="settings-block">
        <div className="settings-row">
          <span className="settings-label">household</span>
          <span className="settings-value">{household?.name ?? '—'}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">version</span>
          <span className="settings-value">web · phase 4</span>
        </div>
      </div>
      <p className="empty-state">Household sharing &amp; category editing land in a later slice.</p>
    </Screen>
  )
}
