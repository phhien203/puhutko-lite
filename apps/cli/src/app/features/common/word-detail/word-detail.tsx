import type { WordDetail } from "@puhutko/shared"
import { useQuery } from "@tanstack/react-query"
import React from "react"

import { isPronunciationPlaybackSupported } from "../../../pronunciation/pronunciation-player"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"
import { wordExampleQueryOptions, wordTagsQueryOptions } from "./word-detail.queries"
import { GradationHeader } from "./gradation"
import { InflectionTable } from "./inflection-table"

type WordDetailProps = {
  contentWidth: number
  detail: WordDetail | null
  focused?: boolean
  pronunciationIndicatorState?: PronunciationIndicatorState
  showTagManagementHint?: boolean
  tagHintText?: string | null
  onTagSelect?: (tagId: string) => void
}

export { normalizeAsciiFontWord, splitStrongGrade } from "./gradation"

export type PronunciationIndicatorState = "hidden" | "recorded" | "tts"

export function WordDetailView({
  contentWidth,
  detail,
  focused = false,
  pronunciationIndicatorState,
  showTagManagementHint = true,
  tagHintText,
  onTagSelect,
}: WordDetailProps) {
  const tagsQuery = useQuery({
    ...wordTagsQueryOptions(detail?.id ?? ""),
    enabled: Boolean(detail),
  })
  const wordExampleQuery = useQuery({
    ...wordExampleQueryOptions(detail?.id ?? ""),
    enabled: Boolean(detail),
  })

  if (!detail) {
    return null
  }

  const assignedTags = (tagsQuery.data ?? [])
    .filter((item) => item.assigned)
    .map((item) => ({ id: item.tag.id, name: item.tag.name }))
  const wordExampleText = wordExampleQuery.data?.text ?? null
  const supportsPronunciationPlayback = isPronunciationPlaybackSupported()
  const effectivePronunciationIndicatorState = pronunciationIndicatorState
    ?? (supportsPronunciationPlayback
      ? (detail.pronunciationAudios?.length ?? 0) > 0
        ? "recorded"
        : "tts"
      : "hidden")

  const exampleLines = wordExampleText ? wordExampleText.split("\n") : []
  const effectiveTagHintText = tagHintText === undefined ? "Ctrl+t Manage tags" : tagHintText

  return (
    <box width="100%" flexDirection="column" gap={1}>
      <GradationHeader word={detail.word} gradation={detail.gradation} />

      <box width="100%" flexDirection="column" gap={0}>
        {detail.pronunciations && detail.pronunciations.length > 0 ? (
          <text>{detail.pronunciations[0]}</text>
        ) : null}
      </box>

      <box width="100%" flexDirection="column">
        {supportsPronunciationPlayback && effectivePronunciationIndicatorState !== "hidden" ? (
          <text fg={homeScreenTheme.mutedText}>
            {effectivePronunciationIndicatorState === "recorded" ? (
              <span fg={draculaColors.green}>• </span>
            ) : effectivePronunciationIndicatorState === "tts" ? (
              <span fg={draculaColors.orange}>• </span>
            ) : null}
            Ctrl+p Pronounce
          </text>
        ) : null}
      </box>

      {detail.meaningGroups.map((group) => (
        <box key={`${detail.id}:${group.partOfSpeech}`} width="100%" flexDirection="column">
          <text fg={draculaColors.pink}>
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
          <strong>
            <span fg={homeScreenTheme.sectionHeaderText}>Tags</span>
          </strong>
        </text>
        {assignedTags.length > 0 ? (
          onTagSelect ? (
            <box width="100%" flexDirection="row">
              {assignedTags.map((tag, index) => (
                <React.Fragment key={`${detail.id}:tag:${tag.id}`}>
                  <text
                    fg={homeScreenTheme.linkText}
                    onMouseUp={() => {
                      onTagSelect(tag.id)
                    }}
                  >
                    {tag.name}
                  </text>
                  {index < assignedTags.length - 1 ? <text>, </text> : null}
                </React.Fragment>
              ))}
            </box>
          ) : (
            <text fg={homeScreenTheme.linkText}>
              {assignedTags.map((tag) => tag.name).join(", ")}
            </text>
          )
        ) : (
          <text fg={homeScreenTheme.mutedText}>No tags yet.</text>
        )}

        {showTagManagementHint && effectiveTagHintText ? (
          <text fg={homeScreenTheme.mutedText}>{effectiveTagHintText}</text>
        ) : null}
      </box>

      <box width="100%" flexDirection="column">
        {wordExampleText ? (
          <box width="100%" flexDirection="column">
            <text>
              <strong>
                <span fg={homeScreenTheme.sectionHeaderText}>Example</span>
              </strong>
              {"  "}
              <span fg={homeScreenTheme.mutedText}>Ctrl+e Edit example</span>
            </text>
            <box border paddingX={2} paddingY={1}>
              <box width="100%" flexDirection="column">
                {exampleLines.map((line, index) => (
                  <text key={`${detail.id}:example:${index}`}>{line.length > 0 ? line : " "}</text>
                ))}
              </box>
            </box>
          </box>
        ) : (
          <text fg={homeScreenTheme.mutedText}>
            Ctrl+e {wordExampleText ? "Edit example" : "Add example"}
          </text>
        )}
      </box>

      <InflectionTable detail={detail} contentWidth={contentWidth} />
    </box>
  )
}
