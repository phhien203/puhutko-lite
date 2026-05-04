export function SettingsScreen() {
  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={56} flexDirection="column" gap={1}>
        <text>
          <strong>Settings</strong>
        </text>
        <text>No configurable CLI settings yet.</text>
        <text>This route is ready for future app-level preferences.</text>
      </box>
    </box>
  )
}
