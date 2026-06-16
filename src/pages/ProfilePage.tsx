import { UserButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ListItem } from '../components/ListItem'
import { ListBulletIcon, QrCodeIcon, ScanIcon, ChevronRightIcon } from '../components/Icons'

export function ProfilePage() {
  const navigate = useNavigate()

  const chevron = (
    <span className="plan-chevron">
      <ChevronRightIcon size={18} />
    </span>
  )

  return (
    <Screen title="settings" right={<UserButton />}>
      <p className="settings-section-title">household settings</p>
      <div className="pantry-list">
        <ListItem
          left={<ListBulletIcon size={20} />}
          title="categories"
          right={chevron}
          onClick={() => navigate('/settings/categories')}
        />
        <ListItem
          left={<QrCodeIcon size={20} />}
          title="share household"
          right={chevron}
          onClick={() => navigate('/settings/share')}
        />
        <ListItem
          left={<ScanIcon size={20} />}
          title="join household"
          right={chevron}
          onClick={() => navigate('/settings/join')}
        />
      </div>
      <p className="settings-version">version · web (phase 4)</p>
    </Screen>
  )
}
