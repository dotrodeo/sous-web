import { UserButton } from '@clerk/clerk-react'
import { Screen } from '../components/Screen'
import { useActiveHousehold } from '../hooks/useUser'

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
      <p className="empty-state">Household sharing &amp; category editing land in the next slice.</p>
    </Screen>
  )
}
