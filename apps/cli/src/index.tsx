import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard, useRenderer } from "@opentui/react"
import { appSignature } from "@puhutko/shared"

function WelcomeScreen() {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "q" || key.name === "escape") {
      renderer.destroy()
    }
  })

  return (
    <box width="100%" height="100%" justifyContent="center" alignItems="center" padding={1}>
      <box
        border
        borderStyle="rounded"
        padding={1}
        width={56}
        flexDirection="column"
        gap={1}
      >
        <text>
          <strong>puhutko-lite</strong>
        </text>
        <text>{appSignature("cli")}</text>
        <text>
          Press <strong>q</strong> or <strong>Esc</strong> to exit.
        </text>
      </box>
    </box>
  )
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true
})

createRoot(renderer).render(<WelcomeScreen />)
