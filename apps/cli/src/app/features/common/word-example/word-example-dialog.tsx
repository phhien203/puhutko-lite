import type { TextareaRenderable } from "@opentui/core"
import { useDialogKeyboard } from "@opentui-ui/dialog/react"
import React from "react"
import { useWordExample } from "../../../providers/word-example-provider"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"

type WordExampleDialogProps = {
  dialogId: string | number
  wordId: string
  word: string
  initialValue: string
  resolve: (value: string) => void
  dismiss: () => void
}

export function WordExampleDialog({
  dialogId,
  wordId,
  word,
  initialValue,
  resolve,
  dismiss,
}: WordExampleDialogProps) {
  const { saveWordExample } = useWordExample()
  const textareaRef = React.useRef<TextareaRenderable | null>(null)
  const [value, setValue] = React.useState(initialValue)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const syncValueFromTextarea = React.useCallback(() => {
    setValue(textareaRef.current?.plainText ?? "")
    setErrorMessage(null)
  }, [])

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const wordExample = await saveWordExample(wordId, value)
      resolve(wordExample.text)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save example.")
      setIsSubmitting(false)
    }
  }, [isSubmitting, resolve, saveWordExample, value, wordId])

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      dismiss()
      return
    }

    if (key.ctrl && key.name === "s") {
      void handleSubmit()
    }
  }, dialogId)

  return (
    <box width="100%" flexDirection="column" gap={1} paddingX={2}>
      <text>
        <strong>Word example</strong> <span>{word}</span>
      </text>

      <box width="100%" height={20}>
        <textarea
          ref={textareaRef}
          initialValue={initialValue}
          focused
          padding={2}
          width="100%"
          height="100%"
          wrapMode="word"
          textColor={draculaColors.foreground}
          placeholder="Add an example sentence..."
          placeholderColor={homeScreenTheme.mutedText}
          onContentChange={syncValueFromTextarea}
        />
      </box>

      {errorMessage ? (
        <text>
          <span fg={homeScreenTheme.errorText}>{errorMessage}</span>
        </text>
      ) : null}

      <text>Ctrl+s Save</text>

      {isSubmitting ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>Saving...</span>
        </text>
      ) : null}
    </box>
  )
}
