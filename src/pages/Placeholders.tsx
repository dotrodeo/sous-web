import { Screen } from '../components/Screen'

/** Phase-1 stubs inside the new shell — each rebuilt in its own phase. */
function ComingSoon({ title }: { title: string }) {
    return (
        <Screen title={title}>
            <div className="empty-state">
                <div className="emoji">🚧</div>
                <div className="title">coming soon</div>
                <div>This screen is being rebuilt in the redesign.</div>
            </div>
        </Screen>
    )
}

export const SettingsPage = () => <ComingSoon title="settings" />
