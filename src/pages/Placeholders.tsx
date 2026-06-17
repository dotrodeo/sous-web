import { Screen } from '../components/Screen'

/** Phase-1 stubs inside the new shell — each rebuilt in its own phase. */
function ComingSoon({
    title,
    action,
}: {
    title: string
    action?: { label: string; onClick: () => void }
}) {
    return (
        <Screen title={title} action={action}>
            <div className="empty-state">
                <div className="emoji">🚧</div>
                <div className="title">coming soon</div>
                <div>This screen is being rebuilt in the redesign.</div>
            </div>
        </Screen>
    )
}

const noop = () => {}

export const PlanPage = () => (
    <ComingSoon title="plan" action={{ label: 'add a day', onClick: noop }} />
)
export const SettingsPage = () => <ComingSoon title="settings" />
