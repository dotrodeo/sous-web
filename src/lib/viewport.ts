// The on-screen keyboard (iPhone especially) covers the bottom of the page without
// resizing it, so a sheet pinned to the bottom ends up under the keyboard, along
// with the field being typed in. This tracks the part of the screen that's actually
// visible (window.visualViewport) as CSS variables that sheets and pop-ups size to:
//   --vv-top, --vv-height  the visible area, in layout-viewport pixels
//   html[data-keyboard="open"]  while the keyboard takes up the bottom of the screen
// and scrolls the focused field into view inside its sheet once the keyboard is up.

/** Anything shorter than this is a browser bar changing size, not a keyboard. */
const KEYBOARD_MIN_PX = 120
/** Where a focused field should stay visible. */
const SHEETS = '.sheet-card, .made-card, .modal-card'

function revealFocusedField() {
    const el = document.activeElement
    if (!(el instanceof HTMLElement) || !el.matches('input, textarea, select')) return
    if (!el.closest(SHEETS)) return
    // Centred, so suggestions that appear under a search field have room too.
    el.scrollIntoView({ block: 'center' })
}

export function trackVisibleViewport(): void {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let revealTimer = 0

    const update = () => {
        root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
        root.style.setProperty('--vv-height', `${vv.height}px`)
        const covered = window.innerHeight - vv.height - vv.offsetTop
        root.dataset.keyboard = covered > KEYBOARD_MIN_PX ? 'open' : 'closed'
        // After the sheet has resized to the space above the keyboard.
        window.clearTimeout(revealTimer)
        revealTimer = window.setTimeout(revealFocusedField, 50)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    // The keyboard animates in after focus; reveal again once it's up.
    document.addEventListener('focusin', () => {
        window.clearTimeout(revealTimer)
        revealTimer = window.setTimeout(revealFocusedField, 350)
    })
}
