import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { QRCodeSVG } from 'qrcode.react'
import {
    ChevronRightIcon,
    LinkIcon,
    ListLinesIcon,
    LogoutIcon,
    MoonIcon,
    ScanIcon,
    ShareQrIcon,
} from '../components/Icons'
import { BottomSheet } from '../components/BottomSheet'
import { TimerAlertsRow } from '../components/TimerAlertsRow'
import { useUser, useActiveHousehold } from '../hooks/useUser'
import { useSetThemePreference, useThemePreference } from '../hooks/useTheme'
import type { ThemePreference } from '../lib/theme'
import { initials } from '../lib/initials'
import { disableAlerts } from '../lib/push'
import { clearOfflineCache } from '../lib/offline'
import { useQueryClient } from '@tanstack/react-query'
import { clearTimers } from '../lib/timers'

// Lazy — pulls in html5-qrcode only when the scanner is actually opened.
const JoinScanner = lazy(() =>
    import('../components/JoinScanner').then((m) => ({ default: m.JoinScanner })),
)

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark']

export function SettingsPage() {
    const navigate = useNavigate()
    const { signOut } = useClerk()
    const queryClient = useQueryClient()
    const { data: user } = useUser()
    const household = useActiveHousehold()
    const theme = useThemePreference()
    const setTheme = useSetThemePreference()

    const [shareOpen, setShareOpen] = useState(false)
    const [joinOpen, setJoinOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    const avatar = initials(user?.name, user?.email)

    const copyToken = async () => {
        if (!household) return
        try {
            await navigator.clipboard.writeText(household.joinToken)
            setCopied(true)
        } catch {
            /* clipboard unavailable */
        }
    }

    return (
        <>
            <div className="blob">
                <div className="blob-actions">
                    <div className="avatar blob-avatar">{avatar}</div>
                </div>
            </div>

            <div className="content narrow">
                <div className="settings-head">
                    <h1>settings</h1>
                    <div className="summary">household settings</div>
                </div>

                <div className="settings-list">
                    <div className="settings-row appearance">
                        <span className="icon">
                            <MoonIcon size={22} />
                        </span>
                        <span className="label">appearance</span>
                        <div className="seg theme-seg" role="radiogroup" aria-label="appearance">
                            {THEME_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={theme === option}
                                    className={theme === option ? 'active' : undefined}
                                    onClick={() => setTheme.mutate(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <TimerAlertsRow />

                    <button
                        type="button"
                        className="settings-row"
                        onClick={() => navigate('/settings/categories')}
                    >
                        <span className="icon">
                            <ListLinesIcon size={22} />
                        </span>
                        <span className="label">categories</span>
                        <span className="chev">
                            <ChevronRightIcon size={20} />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="settings-row"
                        onClick={() => navigate('/settings/ingredient-matches')}
                    >
                        <span className="icon">
                            <LinkIcon size={22} />
                        </span>
                        <span className="label">ingredient matches</span>
                        <span className="chev">
                            <ChevronRightIcon size={20} />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="settings-row"
                        onClick={() => {
                            setCopied(false)
                            setShareOpen(true)
                        }}
                    >
                        <span className="icon">
                            <ShareQrIcon size={22} />
                        </span>
                        <span className="label">share household</span>
                        <span className="chev">
                            <ChevronRightIcon size={20} />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="settings-row"
                        onClick={() => setJoinOpen(true)}
                    >
                        <span className="icon">
                            <ScanIcon size={22} />
                        </span>
                        <span className="label">join household</span>
                        <span className="chev">
                            <ChevronRightIcon size={20} />
                        </span>
                    </button>
                </div>

                <button
                    type="button"
                    className="logout-btn"
                    onClick={async () => {
                        // This device's alerts and timers belong to the signed-in user.
                        await disableAlerts()
                        clearTimers()
                        // The saved offline copy is this account's data.
                        await clearOfflineCache(queryClient)
                        await signOut()
                    }}
                >
                    <LogoutIcon size={20} />
                    log out
                </button>

                <div className="version-line">sous · web</div>
            </div>

            {shareOpen && household && (
                <BottomSheet onClose={() => setShareOpen(false)} className="share">
                    <div className="share-title">share household</div>
                    <div className="share-desc">
                        Invite someone to <strong>{household.name}</strong>. They can scan this code
                        or enter it under “join household”.
                    </div>
                    <div className="qr-wrap">
                        <div className="qr-frame">
                            <QRCodeSVG value={household.joinToken} size={168} />
                        </div>
                    </div>
                    <div className="invite-row">
                        <span className="invite-code">{household.joinToken}</span>
                        <button type="button" className="copy-btn" onClick={copyToken}>
                            {copied ? 'copied' : 'copy'}
                        </button>
                    </div>
                </BottomSheet>
            )}

            {joinOpen && (
                <Suspense fallback={null}>
                    <JoinScanner onClose={() => setJoinOpen(false)} />
                </Suspense>
            )}
        </>
    )
}
