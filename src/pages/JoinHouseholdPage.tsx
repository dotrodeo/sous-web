import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Screen } from '../components/Screen'
import { ChevronLeftIcon } from '../components/Icons'
import { useJoinHousehold } from '../hooks/useHousehold'

const REGION_ID = 'qr-reader'

/** JoinHouseholdView.swift — scan a join-token QR via the camera, then join. */
export function JoinHouseholdPage() {
    const navigate = useNavigate()
    const join = useJoinHousehold()
    const [scanned, setScanned] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [joined, setJoined] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)

    useEffect(() => {
        const scanner = new Html5Qrcode(REGION_ID)
        scannerRef.current = scanner
        let cancelled = false

        scanner
            .start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (decoded) => {
                    if (cancelled) return
                    cancelled = true
                    setScanned(decoded)
                    scanner.stop().catch(() => {})
                },
                () => {},
            )
            .catch((e) => setError(e instanceof Error ? e.message : String(e)))

        return () => {
            cancelled = true
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
                scanner.stop().catch(() => {})
            }
        }
    }, [])

    function handleJoin() {
        if (!scanned) return
        join.mutate(scanned, { onSuccess: () => setJoined(true) })
    }

    return (
        <Screen
            title="join household"
            right={
                <button
                    className="icon-btn"
                    type="button"
                    aria-label="Back"
                    onClick={() => navigate('/settings')}
                >
                    <ChevronLeftIcon />
                </button>
            }
        >
            {joined ? (
                <div className="join-status">
                    <p className="join-done">Joined! 🎉</p>
                    <button className="primary" type="button" onClick={() => navigate('/recipes')}>
                        Go to recipes
                    </button>
                </div>
            ) : scanned ? (
                <div className="join-status">
                    <p className="join-label">scanned code</p>
                    <p className="join-token">{scanned}</p>
                    <button
                        className="primary"
                        type="button"
                        disabled={join.isPending}
                        onClick={handleJoin}
                    >
                        {join.isPending ? 'Joining…' : 'Join household'}
                    </button>
                    {join.isError && (
                        <p className="empty-state">Couldn’t join — check the code and try again.</p>
                    )}
                </div>
            ) : (
                <>
                    <div id={REGION_ID} className="qr-reader" />
                    {error ? (
                        <p className="empty-state">
                            Camera unavailable: {error}. The scanner needs HTTPS (or localhost) and
                            camera permission.
                        </p>
                    ) : (
                        <p className="qr-caption">
                            Point your camera at a “share household” QR code.
                        </p>
                    )}
                </>
            )}
        </Screen>
    )
}
