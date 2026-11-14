// Applies the user's theme preference ('system' | 'light' | 'dark') by setting
// data-theme on <html>; index.css switches the color tokens on it. The preference
// is saved on the user's account (User.themePreference) and cached in
// localStorage, which the inline script in index.html reads before first paint so
// the page doesn't flash the wrong theme.

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'sous-theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

export function normalizeTheme(value: string | null | undefined): ThemePreference {
    return value === 'light' || value === 'dark' ? value : 'system'
}

export function cachedTheme(): ThemePreference {
    try {
        return normalizeTheme(localStorage.getItem(STORAGE_KEY))
    } catch {
        return 'system'
    }
}

function resolve(pref: ThemePreference): 'light' | 'dark' {
    if (pref === 'system') return darkQuery.matches ? 'dark' : 'light'
    return pref
}

export function applyTheme(pref: ThemePreference) {
    document.documentElement.dataset.theme = resolve(pref)
    try {
        localStorage.setItem(STORAGE_KEY, pref)
    } catch {
        /* storage unavailable (private mode); the theme still applies */
    }
}

/** Re-applies 'system' when the device switches between light and dark. */
export function followSystemTheme() {
    darkQuery.addEventListener('change', () => {
        if (cachedTheme() === 'system') applyTheme('system')
    })
}
