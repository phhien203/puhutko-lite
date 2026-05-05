import React from "react"

import { useDialog, useDialogKeyboard } from "@opentui-ui/dialog/react"
import type { WordDetail } from "@puhutko/shared"
import { findNextJumpMatch, getCircularIndex, type TagWithAssignment } from "@puhutko/word-tags"
import { useWordTags } from "../../../providers/word-tags-provider"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"
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
  const { listTagsForWord, createTag, renameTag, deleteTag, toggleTagAssignment } = useWordTags()
  const [tags, setTags] = React.useState<TagWithAssignment[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const selectedIndexRef = React.useRef(0)

  React.useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  const syncSelection = React.useCallback(
    (nextTags: TagWithAssignment[], nextSelectedIndex: number) => {
      const safeSelectedIndex =
        nextTags.length === 0 ? 0 : Math.max(0, Math.min(nextSelectedIndex, nextTags.length - 1))

      setTags(nextTags)
      setSelectedIndex(safeSelectedIndex)
      setScrollOffset((currentOffset) =>
        getVisibleScrollOffset(currentOffset, safeSelectedIndex, nextTags.length),
      )
    },
    [],
  )

  const reloadTags = React.useCallback(
    async (options?: { preferredTagId?: string; fallbackIndex?: number }) => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextTags = await listTagsForWord(detail.id)
        const fallbackIndex = options?.fallbackIndex ?? selectedIndexRef.current
        const preferredTagId = options?.preferredTagId
        const preferredIndex = preferredTagId
          ? nextTags.findIndex((item) => item.tag.id === preferredTagId)
          : -1
        const nextSelectedIndex = preferredIndex >= 0 ? preferredIndex : fallbackIndex

        syncSelection(nextTags, nextSelectedIndex)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load tags.")
      } finally {
        setIsLoading(false)
      }
    },
    [detail.id, listTagsForWord, syncSelection],
  )

  React.useEffect(() => {
    void reloadTags({ fallbackIndex: 0 })
  }, [detail.id])

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
    setTags((currentTags) =>
      currentTags.map((item, index) =>
        index === selectedIndex ? { ...item, assigned: !item.assigned } : item,
      ),
    )

    try {
      const assigned = await toggleTagAssignment(detail.id, selectedTag.tag.id)
      setTags((currentTags) =>
        currentTags.map((item, index) => (index === selectedIndex ? { ...item, assigned } : item)),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update tag assignment.")
      void reloadTags({ preferredTagId: selectedTag.tag.id })
    }
  }, [detail.id, reloadTags, selectedIndex, selectedTag, toggleTagAssignment])

  const handleCreateTag = React.useCallback(async () => {
    const createdTagId = await dialog.prompt<string>({
      backdropOpacity: "50%",
      content: (context) => (
        <TagNameDialog
          dialogId={context.dialogId}
          title="Create tag"
          description={`Add a tag for ${detail.word}.`}
          initialValue=""
          submitLabel="Create"
          submit={createTag}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
    })

    if (createdTagId) {
      await reloadTags({ preferredTagId: createdTagId })
    }
  }, [createTag, detail.word, dialog, reloadTags])

  const handleRenameTag = React.useCallback(async () => {
    if (!selectedTag) {
      return
    }

    const renamedTagId = await dialog.prompt<string>({
      backdropOpacity: "50%",
      content: (context) => (
        <TagNameDialog
          dialogId={context.dialogId}
          title="Rename tag"
          description={`Rename ${selectedTag.tag.name}.`}
          initialValue={selectedTag.tag.name}
          submitLabel="Save"
          submit={(name) => renameTag(selectedTag.tag.id, name)}
          resolve={context.resolve}
          dismiss={context.dismiss}
        />
      ),
    })

    if (renamedTagId) {
      await reloadTags({ preferredTagId: renamedTagId })
    }
  }, [dialog, reloadTags, renameTag, selectedTag])

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
      await deleteTag(selectedTag.tag.id)
      await reloadTags({ fallbackIndex: selectedIndex })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete tag.")
    }
  }, [deleteTag, dialog, reloadTags, selectedIndex, selectedTag])

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      dismiss()
      return
    }

    if (key.ctrl && key.name === "n") {
      void handleCreateTag()
      return
    }

    if (isLoading) {
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
    <box width="100%" flexDirection="column" gap={1}>
      <text>
        <strong>Tags</strong>
        {"  "}
        <span fg={homeScreenTheme.mutedText}>{detail.word}</span>
      </text>

      <text>
        <span fg={homeScreenTheme.mutedText}>
          ↑/↓ Select Space Toggle Ctrl+n New Ctrl+r Rename Ctrl+d Delete Esc Close
        </span>
      </text>

      {errorMessage ? (
        <text>
          <span fg={homeScreenTheme.errorText}>{errorMessage}</span>
        </text>
      ) : null}

      {isLoading ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>Loading tags...</span>
        </text>
      ) : tags.length === 0 ? (
        <box
          width="100%"
          flexDirection="column"
          border
          borderStyle="rounded"
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
                backgroundColor={isSelected ? draculaColors.currentLine : undefined}
              >
                <text>
                  <span fg={item.assigned ? draculaColors.green : homeScreenTheme.mutedText}>
                    {item.assigned ? "[✔︎]" : "[ ]"}
                  </span>{" "}
                  <strong>{item.tag.name}</strong>
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
