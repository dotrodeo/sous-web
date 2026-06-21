import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { Logo, EyeIcon, EyeOffIcon, GoogleGlyph, AppleGlyph, CheckIcon } from '../components/Icons'

type Mode = 'signin' | 'signup'
type Step = 'form' | 'verify' | 'reset'

function clerkError(e: unknown): string {
    const err = e as { errors?: { longMessage?: string; message?: string }[] }
    return (
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Something went wrong. Please try again.'
    )
}

export function LoginPage() {
    const { isLoaded: siReady, signIn, setActive: setActiveSignIn } = useSignIn()
    const { isLoaded: suReady, signUp, setActive: setActiveSignUp } = useSignUp()

    const [mode, setMode] = useState<Mode>('signin')
    const [step, setStep] = useState<Step>('form')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [pwVisible, setPwVisible] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const signUpMode = mode === 'signup'
    const emailOk = /.+@.+\..+/.test(email.trim())
    const canSubmit =
        emailOk && password.length >= 1 && (!signUpMode || name.trim().length > 0) && !busy

    function switchMode(m: Mode) {
        setMode(m)
        setStep('form')
        setError(null)
    }

    async function handleSubmit() {
        if (!canSubmit || !siReady || !suReady) return
        setBusy(true)
        setError(null)
        try {
            if (signUpMode) {
                const res = await signUp.create({
                    emailAddress: email.trim(),
                    password,
                    firstName: name.trim(),
                })
                if (res.status === 'complete') {
                    await setActiveSignUp({ session: res.createdSessionId })
                } else {
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
                    setStep('verify')
                }
            } else {
                const res = await signIn.create({ identifier: email.trim(), password })
                if (res.status === 'complete')
                    await setActiveSignIn({ session: res.createdSessionId })
                else setError('Additional verification is required to sign in.')
            }
        } catch (e) {
            setError(clerkError(e))
        } finally {
            setBusy(false)
        }
    }

    async function handleVerify() {
        if (!suReady || !code.trim()) return
        setBusy(true)
        setError(null)
        try {
            const res = await signUp.attemptEmailAddressVerification({ code: code.trim() })
            if (res.status === 'complete') await setActiveSignUp({ session: res.createdSessionId })
            else setError('That code didn’t work — try again.')
        } catch (e) {
            setError(clerkError(e))
        } finally {
            setBusy(false)
        }
    }

    async function startReset() {
        if (!siReady || !emailOk) {
            setError('Enter your email first, then tap “forgot?”.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() })
            setStep('reset')
        } catch (e) {
            setError(clerkError(e))
        } finally {
            setBusy(false)
        }
    }

    async function handleReset() {
        if (!siReady || !code.trim() || password.length < 1) return
        setBusy(true)
        setError(null)
        try {
            const res = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code: code.trim(),
                password,
            })
            if (res.status === 'complete') await setActiveSignIn({ session: res.createdSessionId })
            else setError('Couldn’t reset — check the code and try again.')
        } catch (e) {
            setError(clerkError(e))
        } finally {
            setBusy(false)
        }
    }

    async function social(strategy: 'oauth_google' | 'oauth_apple') {
        if (!siReady) return
        setError(null)
        try {
            await signIn.authenticateWithRedirect({
                strategy,
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/',
            })
        } catch (e) {
            setError(clerkError(e))
        }
    }

    return (
        <div className="login">
            {/* Brand panel */}
            <div className="login-brand">
                <div className="login-brand-blobs">
                    <span
                        style={{
                            width: 340,
                            height: 340,
                            background: 'rgba(255,255,255,.22)',
                            top: -120,
                            right: -90,
                        }}
                    />
                    <span
                        style={{
                            width: 220,
                            height: 220,
                            background: 'rgba(255,255,255,.16)',
                            bottom: -70,
                            left: -60,
                        }}
                    />
                </div>
                <div className="login-wordmark">
                    <Logo size={40} />
                    sous
                </div>
                <h1 className="login-headline">
                    cook what’s
                    <br />
                    already yours.
                </h1>
                <p className="login-sub">
                    plan meals, track your pantry, and build the shopping list automatically.
                </p>

                <div className="login-cards" aria-hidden="true">
                    <div className="login-card" style={{ transform: 'rotate(-2deg)' }}>
                        <span className="status-dot" style={{ background: 'var(--stocked)' }} />
                        <span style={{ flex: 1, fontWeight: 600 }}>quick flatbread</span>
                        <span className="badge">4 / 4</span>
                    </div>
                    <div
                        className="login-card"
                        style={{ transform: 'rotate(1.5deg)', marginLeft: 24 }}
                    >
                        <span className="status-dot" style={{ background: 'var(--partial)' }} />
                        <span style={{ flex: 1, fontWeight: 600 }}>sage apple pasta</span>
                        <span className="badge">9 / 10</span>
                    </div>
                    <div className="login-card" style={{ transform: 'rotate(-1deg)' }}>
                        <span
                            className="status-dot"
                            style={{
                                background: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CheckIcon size={13} style={{ color: '#fff' }} />
                        </span>
                        <span
                            style={{
                                flex: 1,
                                fontWeight: 600,
                                color: 'var(--ink-60)',
                                textDecoration: 'line-through',
                            }}
                        >
                            red onion
                        </span>
                        <span className="badge" style={{ color: 'var(--ink-60)' }}>
                            ×2
                        </span>
                    </div>
                </div>
            </div>

            {/* Form panel */}
            <div className="login-form-panel">
                <div className="login-form">
                    {step === 'form' && (
                        <>
                            <h2 className="login-h2">
                                {signUpMode ? 'create your kitchen' : 'welcome back'}
                            </h2>
                            <p className="login-subhead">
                                {signUpMode
                                    ? 'start planning in under a minute.'
                                    : 'sign in to your household.'}
                            </p>

                            <div className="seg">
                                <button
                                    className={signUpMode ? '' : 'active'}
                                    onClick={() => switchMode('signin')}
                                    type="button"
                                >
                                    sign in
                                </button>
                                <button
                                    className={signUpMode ? 'active' : ''}
                                    onClick={() => switchMode('signup')}
                                    type="button"
                                >
                                    create account
                                </button>
                            </div>

                            {error && <p className="form-error">{error}</p>}

                            {signUpMode && (
                                <div className="field-row">
                                    <label className="field-label">your name</label>
                                    <input
                                        className="field"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jordan Lee"
                                    />
                                </div>
                            )}

                            <div className="field-row">
                                <label className="field-label">email</label>
                                <input
                                    className="field"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@kitchen.com"
                                />
                            </div>

                            <div className="pw-head">
                                <label className="field-label" style={{ margin: 0 }}>
                                    password
                                </label>
                                {!signUpMode && (
                                    <button className="link-btn" type="button" onClick={startReset}>
                                        forgot?
                                    </button>
                                )}
                            </div>
                            <div className="pw-wrap">
                                <input
                                    className="field"
                                    type={pwVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button
                                    className="pw-toggle"
                                    type="button"
                                    aria-label="toggle password"
                                    onClick={() => setPwVisible((v) => !v)}
                                >
                                    {pwVisible ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
                                </button>
                            </div>

                            <button
                                className="submit"
                                type="button"
                                disabled={!canSubmit}
                                onClick={handleSubmit}
                            >
                                {busy ? 'one sec…' : signUpMode ? 'create account' : 'sign in'}
                            </button>

                            <div className="divider">
                                <div className="rule" />
                                <span>or</span>
                                <div className="rule" />
                            </div>

                            <p className="legal">
                                {signUpMode
                                    ? 'by creating an account you agree to our terms & privacy policy.'
                                    : ''}
                            </p>
                        </>
                    )}

                    {step === 'verify' && (
                        <>
                            <h2 className="login-h2">check your email</h2>
                            <p className="login-subhead">we sent a code to {email}.</p>
                            {error && <p className="form-error">{error}</p>}
                            <div className="field-row">
                                <label className="field-label">verification code</label>
                                <input
                                    className="field"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="123456"
                                    inputMode="numeric"
                                />
                            </div>
                            <button
                                className="submit"
                                type="button"
                                disabled={busy || !code.trim()}
                                onClick={handleVerify}
                            >
                                {busy ? 'verifying…' : 'verify & continue'}
                            </button>
                            <p className="legal">
                                <button
                                    className="link-btn"
                                    type="button"
                                    onClick={() => switchMode('signup')}
                                >
                                    ← back
                                </button>
                            </p>
                        </>
                    )}

                    {step === 'reset' && (
                        <>
                            <h2 className="login-h2">reset password</h2>
                            <p className="login-subhead">
                                enter the code we emailed and a new password.
                            </p>
                            {error && <p className="form-error">{error}</p>}
                            <div className="field-row">
                                <label className="field-label">code</label>
                                <input
                                    className="field"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="123456"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="field-row">
                                <label className="field-label">new password</label>
                                <input
                                    className="field"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                className="submit"
                                type="button"
                                disabled={busy || !code.trim() || password.length < 1}
                                onClick={handleReset}
                            >
                                {busy ? 'resetting…' : 'set new password'}
                            </button>
                            <p className="legal">
                                <button
                                    className="link-btn"
                                    type="button"
                                    onClick={() => switchMode('signin')}
                                >
                                    ← back to sign in
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
