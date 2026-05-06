import type { WordDetail } from "@puhutko/shared"
import { useQuery } from "@tanstack/react-query"
import React from "react"

import { homeScreenTheme } from "../../../theme/colors"
import { wordExampleQueryOptions, wordTagsQueryOptions } from "./word-detail.queries"
import { GradationHeader } from "./gradation"
import { InflectionTable } from "./inflection-table"

type WordDetailProps = {
  detail: WordDetail | null
  focused?: boolean
  showTagManagementHint?: boolean
}

export { normalizeAsciiFontWord, splitStrongGrade } from "./gradation"

export function WordDetailView({
  detail,
  focused = false,
  showTagManagementHint = true,
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

  const assignedTagNames = (tagsQuery.data ?? [])
    .filter((item) => item.assigned)
    .map((item) => item.tag.name)
  const wordExampleText = wordExampleQuery.data?.text ?? null

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

        {showTagManagementHint ? (
          <text fg={homeScreenTheme.mutedText}>Ctrl+t Manage tags</text>
        ) : null}
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
