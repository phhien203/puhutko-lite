import React from "react"

import { useQuery } from "@tanstack/react-query"
import type { WiktionarySearchItem, WordDetail } from "@puhutko/shared"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { wordDetailQueryOptions } from "./details-view.queries"
import { WordDetailView } from "./word-detail/word-detail"

type TagsManagerDialogWord = Pick<WordDetail, "id" | "word">

type DetailsViewProps = {
  item: WiktionarySearchItem | null
  focused?: boolean
  onTagSelect?: (tagId: string) => void
  onSelectionStateChange?: (value: {
    detail: TagsManagerDialogWord | null
    isFetchingDifferentSelection: boolean
  }) => void
}

export function DetailsView({
  item,
  focused = false,
  onTagSelect,
  onSelectionStateChange,
}: DetailsViewProps) {
  const detailQuery = useQuery({
    ...wordDetailQueryOptions(item?.value ?? ""),
    enabled: Boolean(item),
    placeholderData: (previousData) => previousData,
  })

  const detail: WordDetail | null = detailQuery.data ?? null
  const isFetchingDifferentSelection = detailQuery.isFetching && detailQuery.isPlaceholderData
  const activeDetail = item && !detailQuery.isPlaceholderData && detail ? detail : null

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
      paddingX={2}
      minHeight={0}
      backgroundColor={focused ? draculaColors.currentLine : draculaColors.background}
    >
      <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focused}>
        <box width="100%" flexDirection="column" gap={0} padding={0}>
          {item ? (
            detail ? (
              <>
                {isFetchingDifferentSelection ? (
                  <text>
                    <span fg={homeScreenTheme.mutedText}>Loading new selection...</span>
                  </text>
                ) : null}
                <WordDetailView detail={detail} focused={focused} onTagSelect={onTagSelect} />
              </>
            ) : detailQuery.isPending ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.mutedText}>Loading Kaikki details...</span>
                </text>
              </>
            ) : detailQuery.isError ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.errorText}>Failed to load Kaikki details.</span>
                </text>
              </>
            ) : (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.mutedText}>No Kaikki detail found for this word.</span>
                </text>
              </>
            )
          ) : null}
        </box>
      </scrollbox>
    </box>
  )
}
