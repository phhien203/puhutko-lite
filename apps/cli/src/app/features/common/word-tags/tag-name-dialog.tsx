import React from "react"

import { useDialogKeyboard } from "@opentui-ui/dialog/react"
import { MAX_TAG_NAME_LENGTH, type Tag } from "@puhutko/word-tags"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"

type TagNameDialogProps = {
  dialogId: string | number
  title: string
  description: string
  initialValue: string
  submitLabel: string
  resolve: (tagId: string) => void
  dismiss: () => void
  submit: (name: string) => Promise<Tag>
}

export function TagNameDialog({
  dialogId,
  title,
  description,
  initialValue,
  submitLabel,
  resolve,
  dismiss,
  submit,
}: TagNameDialogProps) {
  const [value, setValue] = React.useState(initialValue.slice(0, MAX_TAG_NAME_LENGTH))
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const tag = await submit(value)
      resolve(tag.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save tag.")
      setIsSubmitting(false)
    }
  }, [isSubmitting, resolve, submit, value])

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      dismiss()
      return
    }

    if (key.name === "enter" || key.name === "return") {
      void handleSubmit()
    }
  }, dialogId)

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>{title}</strong>
      </text>

      <text>
        <span fg={homeScreenTheme.mutedText}>{description}</span>
      </text>

      <input
        value={value}
        maxLength={MAX_TAG_NAME_LENGTH}
        onInput={(nextValue) => {
          setValue(nextValue)
          setErrorMessage(null)
        }}
        placeholder="Tag name"
        focused
        width="100%"
        backgroundColor={draculaColors.background}
        focusedBackgroundColor={draculaColors.currentLine}
        placeholderColor={homeScreenTheme.mutedText}
      />

      {errorMessage ? (
        <text>
          <span fg={homeScreenTheme.errorText}>{errorMessage}</span>
        </text>
      ) : null}

      <text>
        {submitLabel} with <strong>Enter</strong>
        {"  "}
        <span fg={homeScreenTheme.mutedText}>Esc Cancel</span>
      </text>

      {isSubmitting ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>Saving...</span>
        </text>
      ) : null}
    </box>
  )
}
