import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CameraOffIcon, CheckIcon, XIcon } from './Icons'
import { useJoinHousehold } from '../hooks/useHousehold'

type Scan = 'requesting' | 'scanning' | 'denied' | 'joining' | 'success'

const READER_ID = 'qr-reader'

/** Fullscreen camera QR scanner to join a household, with manual-code fallback. */
export function JoinScanner({ onClose }: { onClose: () => void }) {
    const join = useJoinHousehold()
    const [scan, setScan] = useState<Scan>('requesting')
    const [manualMode, setManualMode] = useState(false)
    const [joinCode, setJoinCode] = useState('')
    const [joinedName, setJoinedName] = useState('')
    const [error, setError] = useState('')

    const scannerRef = useRef<Html5Qrcode | null>(null)
    const decodedRef = useRef(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const stopCamera = async () => {
        const scanner = scannerRef.current
        scannerRef.current = null
        if (!scanner) return
        try {
            await scanner.stop()
            scanner.clear()
        } catch {
            /* already stopped */
        }
    }

    const succeed = (name: string) => {
        setJoinedName(name)
        setScan('success')
        closeTimer.current = setTimeout(onClose, 1600)
    }

    const submitToken = (token: string) => {
        const value = token.trim()
        if (!value) return
        setError('')
        setScan('joining')
        join.mutate(value, {
            onSuccess: (household) => succeed(household.name),
            onError: () => {
                setError('That code didn’t work. Double-check it and try again.')
                setManualMode(true)
                setScan('scanning')
                decodedRef.current = false
            },
        })
    }

    // Camera lifecycle — runs whenever we're not in manual entry.
    useEffect(() => {
        if (manualMode) return
        let cancelled = false
        decodedRef.current = false
        // Disable the native BarcodeDetector path: on devices that support it,
        // html5-qrcode renders its own camera UI on top of ours, producing a
        // duplicate scan area. Forcing the web decoder keeps a single overlay.
        const scanner = new Html5Qrcode(READER_ID, {
            useBarCodeDetectorIfSupported: false,
            verbose: false,
        })
        scannerRef.current = scanner
        scanner
            .start(
                { facingMode: 'environment' },
                // No qrbox: html5-qrcode would draw its own dimmed scan-box with
                // corner brackets on top of our branded reticle (a visible
                // duplicate). Omitting it scans the full frame with no overlay.
                { fps: 10 },
                (decodedText) => {
                    if (decodedRef.current) return
                    decodedRef.current = true
                    void stopCamera().then(() => submitToken(decodedText))
                },
                () => {
                    /* per-frame decode misses are expected */
                },
            )
            .then(() => {
                if (cancelled) return void stopCamera()
                setScan('scanning')
            })
            .catch(() => {
                if (!cancelled) setScan('denied')
            })
        return () => {
            cancelled = true
            void stopCamera()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manualMode])

    useEffect(
        () => () => {
            if (closeTimer.current) clearTimeout(closeTimer.current)
        },
        [],
    )

    const goManual = () => {
        void stopCamera()
        setManualMode(true)
    }

    const showReader = !manualMode && (scan === 'requesting' || scan === 'scanning')

    return (
        <div className="scanner">
            {showReader && <div id={READER_ID} className="qr-reader" />}

            {scan === 'scanning' && !manualMode && (
                <>
                    <div className="scanner-center">
                        <div className="scan-reticle">
                            <span className="scan-corner tl" />
                            <span className="scan-corner tr" />
                            <span className="scan-corner bl" />
                            <span className="scan-corner br" />
                            <div className="scanline" />
                        </div>
                    </div>
                    <div className="scanner-bottom">
                        <div className="lead">point at a household’s share code</div>
                        <div className="sub">open “share household” on another phone</div>
                        <button type="button" className="scanner-pill" onClick={goManual}>
                            enter code instead
                        </button>
                    </div>
                </>
            )}

            {scan === 'requesting' && !manualMode && (
                <div className="scanner-state">
                    <span className="scanner-spinner" />
                    <span className="muted">starting camera…</span>
                    <button type="button" className="scanner-pill" onClick={goManual}>
                        enter code instead
                    </button>
                </div>
            )}

            {scan === 'joining' && (
                <div className="scanner-state">
                    <span className="scanner-spinner" />
                    <span className="muted">joining…</span>
                </div>
            )}

            {scan === 'denied' && !manualMode && (
                <div className="scanner-state">
                    <div className="scanner-denied-icon">
                        <CameraOffIcon size={28} />
                    </div>
                    <div className="title">camera unavailable</div>
                    <div className="body">
                        allow camera access to scan a code, or enter the invite code by hand.
                    </div>
                    <button type="button" className="scan-btn-primary" onClick={goManual}>
                        enter code instead
                    </button>
                </div>
            )}

            {scan === 'success' && (
                <div className="scanner-success">
                    <div className="ring">
                        <CheckIcon size={46} />
                    </div>
                    <div className="big">you’re in!</div>
                    {joinedName && (
                        <div className="sub">
                            joined <strong>{joinedName}</strong>
                        </div>
                    )}
                </div>
            )}

            {scan !== 'success' && (
                <div className="scanner-topbar">
                    <button
                        type="button"
                        className="scanner-close"
                        aria-label="close"
                        onClick={onClose}
                    >
                        <XIcon size={22} />
                    </button>
                    <span className="title">scan to join</span>
                    <span style={{ width: 44 }} />
                </div>
            )}

            {manualMode && (
                <div className="scan-manual-overlay">
                    <div
                        className="scan-manual-scrim"
                        onClick={() => {
                            setScan('requesting')
                            setManualMode(false)
                        }}
                    />
                    <div className="scan-manual-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">enter invite code</span>
                            <button
                                type="button"
                                className="sheet-save"
                                disabled={!joinCode.trim() || join.isPending}
                                onClick={() => submitToken(joinCode)}
                            >
                                join
                            </button>
                        </div>
                        <div className="sheet-subtitle">
                            the code someone shared with you, e.g. FERN-2931.
                        </div>
                        <input
                            className="field"
                            autoFocus
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    submitToken(joinCode)
                                }
                            }}
                            placeholder="FERN-2931"
                            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        />
                        {error && (
                            <div className="form-error" style={{ marginTop: 12 }}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
