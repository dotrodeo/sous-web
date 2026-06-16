import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ChevronLeftIcon } from '../components/Icons'
import { useActiveHousehold } from '../hooks/useUser'

/** ShareHouseholdView.swift — QR code of the household join token. */
export function ShareHouseholdPage() {
  const navigate = useNavigate()
  const household = useActiveHousehold()
  const token = household?.joinToken ?? ''

  return (
    <Screen
      title="share household"
      right={
        <button className="icon-btn" type="button" aria-label="Back" onClick={() => navigate('/settings')}>
          <ChevronLeftIcon />
        </button>
      }
    >
      <div className="qr-share">
        {token ? (
          <div className="qr-circle">
            <QRCodeSVG value={token} size={220} bgColor="transparent" fgColor="var(--p-foreground)" />
          </div>
        ) : (
          <p className="empty-state">No join token available for this household.</p>
        )}
        <p className="qr-caption">
          Open “join household” on another device and scan this code to share your household.
        </p>
      </div>
    </Screen>
  )
}
