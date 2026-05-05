export function AboutScreen() {
  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={56} flexDirection="column" gap={1}>
        <text>
          <strong>About</strong>
        </text>
        <text>puhutko-lite is a small Bun workspace with a Hono server and OpenTUI CLI.</text>
        <text>This screen exists to validate memory routing inside the terminal app.</text>
      </box>
    </box>
  )
}
