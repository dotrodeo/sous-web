import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { applyTheme, normalizeTheme, type ThemePreference } from '../lib/theme'
import type { User } from '../lib/types'
import { useUser } from './useUser'

/** The signed-in user's theme preference, kept applied to the page. */
export function useThemePreference(): ThemePreference {
    const { data: user } = useUser()
    const pref = normalizeTheme(user?.themePreference)

    useEffect(() => {
        if (user) applyTheme(pref)
    }, [user, pref])

    return pref
}

/** Saves the theme preference to the user's account, applying it immediately. */
export function useSetThemePreference() {
    const api = useApi()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (themePreference: ThemePreference) =>
            api.post<User>('/user', { themePreference }),
        onMutate: async (themePreference) => {
            await qc.cancelQueries({ queryKey: ['user'] })
            const previous = qc.getQueryData<User>(['user'])
            applyTheme(themePreference)
            if (previous) qc.setQueryData<User>(['user'], { ...previous, themePreference })
            return { previous }
        },
        onError: (_err, _pref, context) => {
            if (context?.previous) {
                qc.setQueryData(['user'], context.previous)
                applyTheme(normalizeTheme(context.previous.themePreference))
            }
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['user'] }),
    })
}
