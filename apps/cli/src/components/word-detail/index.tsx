import type { WordDetail } from "@puhutko/shared"
import { homeScreenTheme } from "../../theme/colors"
import { GradationHeader } from "./gradation"
import { InflectionTable } from "./inflection-table"

type WordDetailProps = {
  detail: WordDetail | null
  focused?: boolean
}

export { normalizeAsciiFontWord, splitStrongGrade } from "./gradation"

export function WordDetailView({ detail, focused = false }: WordDetailProps) {
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
