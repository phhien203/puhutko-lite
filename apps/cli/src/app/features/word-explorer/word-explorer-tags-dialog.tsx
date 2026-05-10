import React from "react"

import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/react"
import type { WordDetail } from "@puhutko/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { findNextJumpMatch, getCircularIndex } from "@puhutko/word-tags"
import { wordTagsService } from "../../persistence"
import { queryKeys } from "../../query/query-keys"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { TagNameDialog } from "../common/word-tags/tag-name-dialog"
import { wordTagsQueryOptions } from "../common/word-detail/word-detail.queries"

const VISIBLE_ROW_COUNT = 30

type WordExplorerTagsDialogWord = Pick<WordDetail, "id" | "word">

type WordExplorerTagsDialogProps = {
  detail: WordExplorerTagsDialogWord
  dialogId: string | number
  dismiss: () => void
}

function getVisibleScrollOffset(currentOffset: number, selectedIndex: number, listLength: number) {
  if (listLength <= VISIBLE_ROW_COUNT) {
    return 0
  }

  if (selectedIndex < currentOffset) {
    return selectedIndex
  }

  if (selectedIndex >= currentOffset + VISIBLE_ROW_COUNT) {
    return selectedIndex - VISIBLE_ROW_COUNT + 1
  }

  return currentOffset
}

function getPrintableCharacter(name: string, sequence: string) {
  if (sequence.length === 1) {
    return sequence
  }

  if (name.length === 1) {
    return name
  }

  return ""
}

export function WordExplorerTagsDialog({
  detail,
  dialogId,
  dismiss,
}: WordExplorerTagsDialogProps) {
  const dialog = useDialog()
  const queryClient = useQueryClient()
  const tagsQuery = useQuery(wordTagsQueryOptions(detail.id))
  const createTagMutation = useMutation({
    mutationFn: (name: string) => wordTagsService.createTag(name),
  })
  const assignTagMutation = useMutation({
    mutationFn: ({ wordId, tagId }: { wordId: string; tagId: string }) =>
      wordTagsService.assignTagToWord(wordId, tagId),
  })

  const tags = tagsQuery.data ?? []
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const [preferredTagId, setPreferredTagId] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const selectedIndexRef = React.useRef(0)

  React.useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  React.useEffect(() => {
    if (!preferredTagId || tags.length === 0) {
      return
    }

    const nextIndex = tags.findIndex((item) => item.tag.id === preferredTagId)

    if (nextIndex >= 0) {
      setSelectedIndex(nextIndex)
      setScrollOffset((currentOffset) =>
        getVisibleScrollOffset(currentOffset, nextIndex, tags.length),
      )
    }

    setPreferredTagId(null)
  }, [preferredTagId, tags])

  React.useEffect(() => {
    if (tags.length === 0) {
      setSelectedIndex(0)
      setScrollOffset(0)
      return
    }

    const safeSelectedIndex = Math.max(0, Math.min(selectedIndexRef.current, tags.length - 1))
    setSelectedIndex(safeSelectedIndex)
    setScrollOffset((currentOffset) =>
      getVisibleScrollOffset(currentOffset, safeSelectedIndex, tags.length),
    )
  }, [tags])

  React.useEffect(() => {
    if (!tagsQuery.error) {
      return
    }

    setErrorMessage(tagsQuery.error instanceof Error ? tagsQuery.error.message : "Failed to load tags.")
  }, [tagsQuery.error])

  const selectedTag = tags[selectedIndex] ?? null
  const visibleTags = tags.slice(scrollOffset, scrollOffset + VISIBLE_ROW_COUNT)

  const invalidateExplorerWordQueriesForTag = React.useCallback(
    async (tagId: string) => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey

          if (queryKey[0] !== "word-explorer" || queryKey[1] !== "words") {
            return false
          }

          const queryTagIds = queryKey[2]

          return Array.isArray(queryTagIds) && queryTagIds.includes(tagId)
        },
      })
    },
    [queryClient],
  )

  const invalidateAssignmentQueries = React.useCallback(async (tagId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.wordExplorerTags() }),
      invalidateExplorerWordQueriesForTag(tagId),
    ])
  }, [detail.id, invalidateExplorerWordQueriesForTag, queryClient])

  const invalidateCreatedTagQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.wordExplorerTags() }),
      queryClient.invalidateQueries({ queryKey: ["word-tags"] }),
    ])
  }, [detail.id, queryClient])

  const moveSelection = React.useCallback(
    (delta: 1 | -1) => {
      if (tags.length === 0) {
        return
      }

      setSelectedIndex((currentIndex) => {
        const nextIndex = getCircularIndex(currentIndex, delta, tags.length)
        setScrollOffset((currentOffset) =>
          getVisibleScrollOffset(currentOffset, nextIndex, tags.length),
        )
        return nextIndex
      })
    },
    [tags.length],
  )

  const handleAssignSelectedTag = React.useCallback(async () => {
    if (!selectedTag || selectedTag.assigned || assignTagMutation.isPending) {
      return
    }

    setErrorMessage(null)

    try {
      await assignTagMutation.mutateAsync({
        wordId: detail.id,
        tagId: selectedTag.tag.id,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to assign tag.")
    }

    await invalidateAssignmentQueries(selectedTag.tag.id)
  }, [assignTagMutation, detail.id, invalidateAssignmentQueries, selectedTag])

  const handleCreateTag = React.useCallback(async () => {
    setErrorMessage(null)

    const createdTagId = await dialog.prompt<string>({
      content: (context) => (
        <TagNameDialog
          dialogId={context.dialogId}
          title="Create tag"
          description={`Create a tag for ${detail.word}.`}
          initialValue=""
          submitLabel="Create"
          submit={createTagMutation.mutateAsync}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
    })

    if (!createdTagId) {
      return
    }

    setPreferredTagId(createdTagId)

    try {
      await assignTagMutation.mutateAsync({
        wordId: detail.id,
        tagId: createdTagId,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to assign tag.")
    }

    await invalidateCreatedTagQueries()
  }, [assignTagMutation, createTagMutation.mutateAsync, detail.id, detail.word, dialog, invalidateCreatedTagQueries])

  useDialogKeyboard(
    (key) => {
      if (key.name === "escape") {
        dismiss()
        return
      }

      if (key.ctrl && key.name === "n") {
        void handleCreateTag()
        return
      }

      if (tagsQuery.isPending) {
        return
      }

      if (key.name === "up") {
        moveSelection(-1)
        return
      }

      if (key.name === "down") {
        moveSelection(1)
        return
      }

      if (key.name === "space") {
        if (!selectedTag?.assigned) {
          void handleAssignSelectedTag()
        }
        return
      }

      if (key.ctrl || key.meta || key.option) {
        return
      }

      const typedCharacter = getPrintableCharacter(key.name, key.sequence)

      if (typedCharacter.length !== 1 || tags.length === 0) {
        return
      }

      const nextIndex = findNextJumpMatch(
        tags.map((item) => item.tag),
        selectedIndex,
        typedCharacter,
      )

      if (nextIndex !== selectedIndex) {
        setSelectedIndex(nextIndex)
        setScrollOffset((currentOffset) =>
          getVisibleScrollOffset(currentOffset, nextIndex, tags.length),
        )
      }
    },
    dialogId,
  )

  return (
    <box width="100%" flexDirection="column" gap={1} paddingX={2} paddingTop={1}>
      <text>
        <strong>Add tags to</strong>
        {"  "}
        <span>{detail.word}</span>
      </text>

      <text>
        <span fg={homeScreenTheme.mutedText}>[Space] Assign{"   "}Ctrl+n New</span>
      </text>

      {errorMessage ? (
        <text>
          <span fg={homeScreenTheme.errorText}>{errorMessage}</span>
        </text>
      ) : null}

      {tagsQuery.isPending ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>Loading tags...</span>
        </text>
      ) : tags.length === 0 ? (
        <box
          width="100%"
          flexDirection="column"
          border
          borderColor={draculaColors.comment}
          padding={1}
        >
          <text>
            <span fg={homeScreenTheme.mutedText}>
              No tags yet. Press Ctrl+n to create the first tag.
            </span>
          </text>
        </box>
      ) : (
        <box
          width="100%"
          flexDirection="column"
          border
          borderColor={draculaColors.comment}
          paddingY={0}
        >
          {visibleTags.map((item, visibleIndex) => {
            const tagIndex = scrollOffset + visibleIndex
            const isSelected = tagIndex === selectedIndex

            return (
              <box
                key={item.tag.id}
                width="100%"
                paddingX={1}
                backgroundColor={isSelected ? draculaColors.purple : undefined}
              >
                <text fg={item.assigned ? draculaColors.yellow : undefined}>
                  {item.assigned ? <strong>{`[*] ${item.tag.name}`}</strong> : `[ ] ${item.tag.name}`}
                </text>
              </box>
            )
          })}
        </box>
      )}

      {tags.length > 0 ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + VISIBLE_ROW_COUNT, tags.length)} of {tags.length}
          </span>
        </text>
      ) : null}
    </box>
  )
}
