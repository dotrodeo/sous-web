import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/useApi'
import { householdService } from '../lib/services'
import { useActiveHousehold } from './useUser'

/** POST /household/{id}/join — HouseholdService.joinHousehold(). */
export function useJoinHousehold() {
    const api = useApi()
    const household = useActiveHousehold()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (joinToken: string) => householdService.join(api, household!.id, joinToken),
        // Joining changes the user's household membership.
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
    })
}
