import { useDialogKeyboard } from "@opentui-ui/dialog/react"
import React from "react"
import { draculaColors, homeScreenTheme } from "../../theme/colors"

type DeleteTagDialogProps = {
  dialogId: string | number
  tagName: string
  resolve: (confirmed: boolean) => void
  dismiss: () => void
}

export function DeleteTagDialog({ dialogId, tagName, resolve, dismiss }: DeleteTagDialogProps) {
  const [selectedAction, setSelectedAction] = React.useState<"cancel" | "delete">("cancel")

  useDialogKeyboard(
    (key) => {
      if (key.name === "escape") {
        dismiss()
        return
      }

      if (key.name === "tab" || key.name === "left" || key.name === "right") {
        setSelectedAction((currentAction) => (currentAction === "cancel" ? "delete" : "cancel"))
        return
      }

      if (key.name === "enter" || key.name === "return") {
        resolve(selectedAction === "delete")
      }
    },
    dialogId,
  )

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>Delete tag</strong>
      </text>

      <text>
        Delete <strong>{tagName}</strong> and remove its assignments?
      </text>

      <box width="100%" gap={1}>
        <box
          paddingX={1}
          backgroundColor={selectedAction === "cancel" ? draculaColors.currentLine : undefined}
          border={selectedAction === "cancel"}
          borderStyle="rounded"
          borderColor={draculaColors.foreground}
        >
          <text>Cancel</text>
        </box>

        <box
          paddingX={1}
          backgroundColor={selectedAction === "delete" ? draculaColors.red : undefined}
          border={selectedAction === "delete"}
          borderStyle="rounded"
          borderColor={draculaColors.foreground}
        >
          <text>Delete</text>
        </box>
      </box>

      <text>
        <span fg={homeScreenTheme.mutedText}>Tab/Left/Right Switch</span>
        {"  "}
        Enter Confirm  Esc Cancel
      </text>
    </box>
  )
}
