import { appSignature } from "@puhutko/shared"

export function HomeScreen() {
  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center">
      <box width={56} flexDirection="column" gap={1}>
        <text>
          <strong>Welcome</strong>
        </text>
        <text>{appSignature("cli")}</text>
        <text>Use the footer shortcuts to move between screens.</text>
      </box>
    </box>
  )
}
