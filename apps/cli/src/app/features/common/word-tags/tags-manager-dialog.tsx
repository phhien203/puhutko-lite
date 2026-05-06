import React from "react"

import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/react"
import type { WordDetail } from "@puhutko/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { findNextJumpMatch, getCircularIndex } from "@puhutko/word-tags"
import { wordTagsService } from "../../../persistence"
import { queryKeys } from "../../../query/query-keys"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"
import { wordTagsQueryOptions } from "../word-detail/word-detail.queries"
import { DeleteTagDialog } from "./delete-tag-dialog"
import { TagNameDialog } from "./tag-name-dialog"

const VISIBLE_ROW_COUNT = 8

type TagsManagerDialogWord = Pick<WordDetail, "id" | "word">

type TagsManagerDialogProps = {
  detail: TagsManagerDialogWord
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

export function TagsManagerDialog({ detail, dialogId, dismiss }: TagsManagerDialogProps) {
  const dialog = useDialog()
  const queryClient = useQueryClient()
  const tagsQuery = useQuery(wordTagsQueryOptions(detail.id))
  const createTagMutation = useMutation({
    mutationFn: (name: string) => wordTagsService.createTag(name),
  })
  const renameTagMutation = useMutation({
    mutationFn: ({ tagId, name }: { tagId: string; name: string }) => wordTagsService.renameTag(tagId, name),
  })
  const deleteTagMutation = useMutation({
    mutationFn: (tagId: string) => wordTagsService.deleteTag(tagId),
  })
  const toggleTagAssignmentMutation = useMutation({
    mutationFn: ({ wordId, tagId }: { wordId: string; tagId: string }) =>
      wordTagsService.toggleTagAssignment(wordId, tagId),
  })

  const tags = tagsQuery.data ?? []
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [preferredTagId, setPreferredTagId] = React.useState<string | null>(null)
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
      setScrollOffset((currentOffset) => getVisibleScrollOffset(currentOffset, nextIndex, tags.length))
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

  const handleToggleAssignment = React.useCallback(async () => {
    if (!selectedTag) {
      return
    }

    setErrorMessage(null)

    try {
      await toggleTagAssignmentMutation.mutateAsync({
        wordId: detail.id,
        tagId: selectedTag.tag.id,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update tag assignment.")
      await queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) })
    }
  }, [detail.id, queryClient, selectedTag, toggleTagAssignmentMutation])

  const handleCreateTag = React.useCallback(async () => {
    const createdTagId = await dialog.prompt<string>({
      content: (context) => (
        <TagNameDialog
          dialogId={context.dialogId}
          title="Create tag"
          description={`Add a tag for ${detail.word}.`}
          initialValue=""
          submitLabel="Create"
          submit={createTagMutation.mutateAsync}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
    })

    if (createdTagId) {
      setPreferredTagId(createdTagId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) })
    }
  }, [createTagMutation.mutateAsync, detail.id, detail.word, dialog, queryClient])

  const handleRenameTag = React.useCallback(async () => {
    if (!selectedTag) {
      return
    }

    const renamedTagId = await dialog.prompt<string>({
      content: (context) => (
        <TagNameDialog
          dialogId={context.dialogId}
          title="Rename tag"
          description={`Rename ${selectedTag.tag.name}.`}
          initialValue={selectedTag.tag.name}
          submitLabel="Save"
          submit={(name) => renameTagMutation.mutateAsync({ tagId: selectedTag.tag.id, name })}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
    })

    if (renamedTagId) {
      setPreferredTagId(renamedTagId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) })
    }
  }, [detail.id, dialog, queryClient, renameTagMutation, selectedTag])

  const handleDeleteTag = React.useCallback(async () => {
    if (!selectedTag) {
      return
    }

    const confirmed = await dialog.confirm({
      content: (context) => (
        <DeleteTagDialog
          dialogId={context.dialogId}
          tagName={selectedTag.tag.name}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
      fallback: false,
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteTagMutation.mutateAsync(selectedTag.tag.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.wordTags(detail.id) })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete tag.")
    }
  }, [deleteTagMutation, detail.id, dialog, queryClient, selectedTag])

  useDialogKeyboard((key) => {
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

    if (key.ctrl && key.name === "r") {
      void handleRenameTag()
      return
    }

    if (key.ctrl && key.name === "d") {
      void handleDeleteTag()
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
      void handleToggleAssignment()
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
  }, dialogId)

  return (
    <box width="100%" flexDirection="column" gap={1} paddingX={2} paddingTop={1}>
      <text>
        <strong>Manage tags for</strong>
        {"  "}
        <span>{detail.word}</span>
      </text>

      <text>
        <span fg={homeScreenTheme.mutedText}>
          [Space] Toggle{"   "}Ctrl+n New{"   "}Ctrl+r Rename{"   "}Ctrl+d Delete
        </span>
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
                <text>
                  <strong>{item.assigned ? "[✔︎]" : "[ ]"}</strong> <span>{item.tag.name}</span>
                </text>
              </box>
            )
          })}
        </box>
      )}

      {tags.length > 0 ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + VISIBLE_ROW_COUNT, tags.length)} of{" "}
            {tags.length}
          </span>
        </text>
      ) : null}
    </box>
  )
}
