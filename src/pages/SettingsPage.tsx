import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { QRCodeSVG } from 'qrcode.react'
import {
    ChevronRightIcon,
    ListLinesIcon,
    LogoutIcon,
    ScanIcon,
    ShareQrIcon,
} from '../components/Icons'
import { useUser, useActiveHousehold } from '../hooks/useUser'
import { initials } from '../lib/initials'

// Lazy — pulls in html5-qrcode only when the scanner is actually opened.
const JoinScanner = lazy(() =>
    import('../components/JoinScanner').then((m) => ({ default: m.JoinScanner })),
)

export function SettingsPage() {
    const navigate = useNavigate()
    const { signOut } = useClerk()
    const { data: user } = useUser()
    const household = useActiveHousehold()

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

            <div className="content">
                <div className="settings-head">
                    <h1>settings</h1>
                    <div className="summary">household settings</div>
                </div>

                <div className="settings-list">
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

                <button type="button" className="logout-btn" onClick={() => signOut()}>
                    <LogoutIcon size={20} />
                    log out
                </button>

                <div className="version-line">sous · web</div>
            </div>

            {shareOpen && household && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setShareOpen(false)} />
                    <div className="sheet-card share">
                        <div className="sheet-grabber" />
                        <div className="share-title">share household</div>
                        <div className="share-desc">
                            Invite someone to <strong>{household.name}</strong>. They can scan this
                            code or enter it under “join household”.
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
                    </div>
                </div>
            )}

            {joinOpen && (
                <Suspense fallback={null}>
                    <JoinScanner onClose={() => setJoinOpen(false)} />
                </Suspense>
            )}
        </>
    )
}
