import React from "react"
import "opentui-spinner/react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { WordDetail } from "@puhutko/shared"
import { queryKeys } from "../../query/query-keys"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { wordDetailQueryOptions } from "./details-view.queries"
import { type PronunciationIndicatorState, WordDetailView } from "./word-detail/word-detail"

type TagsManagerDialogWord = Pick<WordDetail, "id" | "word">

export type DetailSelection = {
  query: string
  label: string
}

type DetailsViewProps = {
  contentWidth: number
  selection: DetailSelection | null
  focused?: boolean
  showTagManagementHint?: boolean
  emptyStateMessage?: string
  onTagSelect?: (tagId: string) => void
  onSelectionStateChange?: (value: {
    detail: TagsManagerDialogWord | null
    isFetchingDifferentSelection: boolean
  }) => void
}

export function DetailsView({
  contentWidth,
  selection,
  focused = false,
  showTagManagementHint = true,
  emptyStateMessage,
  onTagSelect,
  onSelectionStateChange,
}: DetailsViewProps) {
  const queryClient = useQueryClient()
  const detailQuery = useQuery({
    ...wordDetailQueryOptions(selection?.query ?? ""),
    enabled: Boolean(selection),
    placeholderData: (previousData) => previousData,
  })

  const detail: WordDetail | null = detailQuery.data ?? null
  const isFetchingDifferentSelection = detailQuery.isFetching && detailQuery.isPlaceholderData
  const showPendingSpinner = detailQuery.isPending || isFetchingDifferentSelection
  const activeDetail = selection && !detailQuery.isPlaceholderData && detail ? detail : null
  const selectedCachedDetail = selection
    ? (queryClient.getQueryData<WordDetail | null>(queryKeys.wordDetail(selection.query)) ?? null)
    : null
  const pronunciationIndicatorState = getPronunciationIndicatorState(
    activeDetail ?? selectedCachedDetail,
  )

  React.useEffect(() => {
    onSelectionStateChange?.({
      detail: activeDetail ? { id: activeDetail.id, word: activeDetail.word } : null,
      isFetchingDifferentSelection,
    })
  }, [activeDetail, isFetchingDifferentSelection, onSelectionStateChange])

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      position="relative"
      paddingY={1}
      paddingX={2}
      minHeight={0}
      backgroundColor={draculaColors.background}
    >
      <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focused}>
        <box width="100%" flexDirection="column" gap={0} padding={0}>
          {selection ? (
            detail ? (
              <>
                <WordDetailView
                  contentWidth={contentWidth}
                  detail={detail}
                  focused={focused}
                  pronunciationIndicatorState={pronunciationIndicatorState}
                  showTagManagementHint={showTagManagementHint}
                  onTagSelect={onTagSelect}
                />
              </>
            ) : detailQuery.isPending ? (
              <>
                <text>
                  <strong>{selection.label}</strong>
                </text>
              </>
            ) : detailQuery.isError ? (
              <>
                <text>
                  <strong>{selection.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.errorText}>Failed to load word details.</span>
                </text>
              </>
            ) : (
              <>
                <text>
                  <strong>{selection.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.mutedText}>No word detail found for this word.</span>
                </text>
              </>
            )
          ) : emptyStateMessage ? (
            <text>
              <span fg={homeScreenTheme.mutedText}>{emptyStateMessage}</span>
            </text>
          ) : null}
        </box>
      </scrollbox>
      {selection && showPendingSpinner ? (
        <box position="absolute" top={0} left={1}>
          <spinner name="aesthetic" color={draculaColors.pink} />
        </box>
      ) : null}
    </box>
  )
}

function getPronunciationIndicatorState(
  detail: WordDetail | null,
): PronunciationIndicatorState {
  if (!detail) {
    return "hidden"
  }

  return (detail.pronunciationAudios?.length ?? 0) > 0 ? "recorded" : "tts"
}
