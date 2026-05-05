import type { WordDetail } from "@puhutko/shared"
import React from "react"
import { useWordTags } from "../../features/word-tags/word-tags-provider"
import { homeScreenTheme } from "../../theme/colors"
import { GradationHeader } from "./gradation"
import { InflectionTable } from "./inflection-table"

type WordDetailProps = {
  detail: WordDetail | null
  focused?: boolean
}

export { normalizeAsciiFontWord, splitStrongGrade } from "./gradation"

export function WordDetailView({ detail, focused = false }: WordDetailProps) {
  const { changeToken, listTagsForWord } = useWordTags()
  const [assignedTagNames, setAssignedTagNames] = React.useState<string[]>([])

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

  if (!detail) {
    return null
  }

  return (
    <box
      width="100%"
      flexDirection="column"
      gap={1}
      backgroundColor={focused ? homeScreenTheme.panelFocusedBackground : undefined}
    >
      <box width="100%" flexDirection="column" gap={1}>
        <GradationHeader word={detail.word} gradation={detail.gradation} />

        {detail.pronunciations && detail.pronunciations.length > 0 ? (
          <text>{detail.pronunciations.join(", ")}</text>
        ) : null}

        <text>
          <span fg={homeScreenTheme.mutedText}>{detail.partOfSpeech}</span>
        </text>

        <box width="100%" flexDirection="column">
          <text>
            <strong>Tags</strong>
            {"  "}
            <span fg={homeScreenTheme.mutedText}>Ctrl+t Manage tags</span>
          </text>

          <text>
            {assignedTagNames.length > 0 ? assignedTagNames.join(", ") : <span fg={homeScreenTheme.mutedText}>No tags yet.</span>}
          </text>
        </box>
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
            <text key={`${detail.id}:${group.partOfSpeech}:${index}`}>{index + 1}. {meaning}</text>
          ))}
        </box>
      ))}

      <InflectionTable detail={detail} />
    </box>
  )
}
