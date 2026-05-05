export function NotFoundScreen() {
  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={56} flexDirection="column" gap={1}>
        <text>
          <strong>Not Found</strong>
        </text>
        <text>The current route does not exist.</text>
        <text>Press <strong>h</strong> to return home.</text>
      </box>
    </box>
  )
}
