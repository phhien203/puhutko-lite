import type { WordDetail } from "@puhutko/shared"
import React from "react"

import { useWordExample } from "../../../providers/word-example-provider"
import { useWordTags } from "../../../providers/word-tags-provider"
import { homeScreenTheme } from "../../../theme/colors"
import { GradationHeader } from "./gradation"
import { InflectionTable } from "./inflection-table"

type WordDetailProps = {
  detail: WordDetail | null
  focused?: boolean
}

export { normalizeAsciiFontWord, splitStrongGrade } from "./gradation"

export function WordDetailView({ detail, focused = false }: WordDetailProps) {
  const { changeToken, listTagsForWord } = useWordTags()
  const { changeToken: wordExampleChangeToken, getWordExample } = useWordExample()
  const [assignedTagNames, setAssignedTagNames] = React.useState<string[]>([])
  const [wordExampleText, setWordExampleText] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!detail) {
      setAssignedTagNames([])
      return
    }

    let cancelled = false

    void (async () => {
      const tags = await listTagsForWord(detail.id)

      if (cancelled) {
        return
      }

      setAssignedTagNames(tags.filter((item) => item.assigned).map((item) => item.tag.name))
    })()

    return () => {
      cancelled = true
    }
  }, [changeToken, detail, listTagsForWord])

  React.useEffect(() => {
    if (!detail) {
      setWordExampleText(null)
      return
    }

    let cancelled = false

    void (async () => {
      const wordExample = await getWordExample(detail.id)

      if (cancelled) {
        return
      }

      setWordExampleText(wordExample?.text ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [detail, getWordExample, wordExampleChangeToken])

  if (!detail) {
    return null
  }

  const exampleLines = wordExampleText ? wordExampleText.split("\n") : []

  return (
    <box
      width="100%"
      flexDirection="column"
      gap={1}
      backgroundColor={focused ? homeScreenTheme.panelFocusedBackground : undefined}
    >
      <GradationHeader word={detail.word} gradation={detail.gradation} />

      <box width="100%" flexDirection="column" gap={0}>
        {detail.pronunciations && detail.pronunciations.length > 0 ? (
          <text>{detail.pronunciations.join(", ")}</text>
        ) : null}
      </box>

      {detail.pronunciationUrl ? (
        <box width="100%" flexDirection="column">
          <text>
            <strong>Audio</strong>
          </text>
          <text>
            <span fg={homeScreenTheme.linkText}>{detail.pronunciationUrl}</span>
          </text>
        </box>
      ) : null}

      {detail.meaningGroups.map((group) => (
        <box key={`${detail.id}:${group.partOfSpeech}`} width="100%" flexDirection="column">
          <text>
            <strong>{group.partOfSpeech}</strong>
          </text>

          {group.meanings.map((meaning, index) => (
            <text key={`${detail.id}:${group.partOfSpeech}:${index}`}>
              {index + 1}. {meaning}
            </text>
          ))}
        </box>
      ))}

      <box width="100%" flexDirection="column">
        <text>
          <strong>Tags</strong>
          {"  "}
          <span fg={homeScreenTheme.linkText}>
            {assignedTagNames.length > 0 ? (
              assignedTagNames.join(", ")
            ) : (
              <span fg={homeScreenTheme.mutedText}>No tags yet.</span>
            )}
          </span>
        </text>

        <text fg={homeScreenTheme.mutedText}>Ctrl+t Manage tags</text>
      </box>

      <box width="100%" flexDirection="column">
        {wordExampleText ? (
          <box border paddingX={2} paddingY={1}>
            <text>
              <strong>Example</strong>
              {"  "}
              {wordExampleText ? (
                <span fg={homeScreenTheme.mutedText}>
                  Ctrl+e {wordExampleText ? "Edit example" : "Add example"}
                </span>
              ) : null}
            </text>
            <box width="100%" flexDirection="column" marginTop={1}>
              {exampleLines.map((line, index) => (
                <text key={`${detail.id}:example:${index}`}>{line.length > 0 ? line : " "}</text>
              ))}
            </box>
          </box>
        ) : (
          <text fg={homeScreenTheme.mutedText}>
            Ctrl+e {wordExampleText ? "Edit example" : "Add example"}
          </text>
        )}
      </box>

      <InflectionTable detail={detail} />
    </box>
  )
}
