import { useDialog, useDialogState } from "@opentui-ui/dialog/react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import {
  findNextJumpMatch,
  type TagWithWordCount,
  type WordExplorerSortMode,
  type WordExplorerWord,
} from "@puhutko/word-tags"
import React from "react"
import { useNavigate, useOutletContext, useSearchParams } from "react-router"

import type { RootLayoutOutletContext } from "../../root-layout.types"
import { playPronunciation, stopPronunciation } from "../../pronunciation/pronunciation-player"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { DetailsView } from "../common/details-view"
import { wordDetailQueryOptions } from "../common/details-view.queries"
import { WordExampleDialog } from "../common/word-example/word-example-dialog"
import { wordExampleQueryOptions } from "../common/word-detail/word-detail.queries"
import {
  FULLSCREEN_OVERLAY_WIDTH,
  NARROW_TERMINAL_WIDTH,
} from "../word-search/word-search.constants"
import {
  wordExplorerTagsQueryOptions,
  wordExplorerWordsQueryOptions,
} from "./word-explorer.queries"
import { WordExplorerTagsDialog } from "./word-explorer-tags-dialog"

const SIDEBAR_WIDTH = 46

function getDetailsContentWidth(terminalWidth: number, isSplitSidebarVisible: boolean) {
  const layoutGapWidth = isSplitSidebarVisible ? 2 : 0
  const sidebarWidth = isSplitSidebarVisible ? SIDEBAR_WIDTH : 0
  const detailsHorizontalPadding = 8

  return Math.max(0, terminalWidth - sidebarWidth - layoutGapWidth - detailsHorizontalPadding)
}

type FocusTarget = "tags" | "words" | "details"

type SidebarContentProps = {
  focusTarget: FocusTarget
  selectedTagIds: string[]
  sortMode: WordExplorerSortMode
  tagSelectedIndex: number
  tags: TagWithWordCount[]
  tagsScrollboxRef: React.RefObject<ScrollBoxRenderable | null>
  wordSelectedIndex: number
  words: WordExplorerWord[]
  wordsScrollboxRef: React.RefObject<ScrollBoxRenderable | null>
}

function getTagItemId(tagId: string) {
  return `tag-item-${tagId}`
}

function getWordItemId(wordId: string) {
  return `word-item-${wordId}`
}

function getWordFromWordId(wordId: string): string {
  const segments = wordId.split(":")

  if (segments.length >= 3 && segments[0] === "kaikki") {
    const extracted = segments.slice(1, -1).join(":").trim()
    return extracted.length > 0 ? extracted : wordId
  }

  return wordId
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

function getNextIndex(currentIndex: number, delta: 1 | -1, length: number): number {
  if (length <= 0) {
    return 0
  }

  return (currentIndex + delta + length) % length
}

function findNextWordJumpMatch(words: string[], currentIndex: number, typedChar: string): number {
  if (words.length === 0 || typedChar.length !== 1) {
    return currentIndex
  }

  const lowered = typedChar.toLocaleLowerCase("fi-FI")

  for (let offset = 1; offset <= words.length; offset += 1) {
    const nextIndex = (currentIndex + offset + words.length) % words.length
    const word = words[nextIndex]

    if (word && word.toLocaleLowerCase("fi-FI").startsWith(lowered)) {
      return nextIndex
    }
  }

  return currentIndex
}

function SidebarContent({
  focusTarget,
  selectedTagIds,
  sortMode,
  tagSelectedIndex,
  tags,
  tagsScrollboxRef,
  wordSelectedIndex,
  words,
  wordsScrollboxRef,
}: SidebarContentProps) {
  return (
    <box flexDirection="column" gap={1}>
      <box
        height={"50%"}
        backgroundColor={
          focusTarget === "tags" ? draculaColors.currentLine : draculaColors.background
        }
        flexDirection="column"
      >
        <text marginX={2} marginY={1} paddingBottom={1}>
          <strong>Tags</strong>
          <span fg={homeScreenTheme.mutedText}> [Space] Toggle</span>
        </text>
        <scrollbox
          ref={tagsScrollboxRef}
          width="100%"
          flexGrow={1}
          minHeight={0}
          focused={focusTarget === "tags"}
        >
          <box width="100%" flexDirection="column">
            {tags.map((tag, index) => {
              const isSelected = index === tagSelectedIndex
              const isActive = selectedTagIds.includes(tag.id)

              return (
                <box
                  key={tag.id}
                  id={getTagItemId(tag.id)}
                  width="100%"
                  paddingX={2}
                  backgroundColor={isSelected ? draculaColors.purple : undefined}
                >
                  <text fg={isActive ? draculaColors.yellow : undefined}>
                    {isActive ? (
                      <strong>{`[*] ${tag.name} (${tag.wordCount})`}</strong>
                    ) : (
                      `[ ] ${tag.name} (${tag.wordCount})`
                    )}
                  </text>
                </box>
              )
            })}
          </box>
        </scrollbox>
      </box>

      <box
        height={"50%"}
        backgroundColor={
          focusTarget === "words" ? draculaColors.currentLine : draculaColors.background
        }
        flexDirection="column"
      >
        <text marginX={2} marginY={1} paddingBottom={1}>
          <strong>Words</strong>
          <span fg={homeScreenTheme.mutedText}>
            {`  [Ctrl+S] Sorting by ${sortMode === "alphabetical" ? "A-Z" : "Added"}`}
          </span>
        </text>
        <scrollbox
          ref={wordsScrollboxRef}
          width="100%"
          flexGrow={1}
          minHeight={0}
          focused={focusTarget === "words"}
        >
          <box width="100%" flexDirection="column">
            {words.map((item, index) => {
              const isSelected = index === wordSelectedIndex

              return (
                <box
                  key={item.wordId}
                  id={getWordItemId(item.wordId)}
                  width="100%"
                  paddingX={2}
                  backgroundColor={isSelected ? draculaColors.purple : undefined}
                >
                  <text>{getWordFromWordId(item.wordId)}</text>
                </box>
              )
            })}
          </box>
        </scrollbox>
      </box>
    </box>
  )
}

export function WordExplorer() {
  const dialog = useDialog()
  const isDialogOpen = useDialogState((state) => state.isOpen)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { setAutocompleteActive, setToggleSidebarShortcutHandler } =
    useOutletContext<RootLayoutOutletContext>()
  const { width } = useTerminalDimensions()
  const [searchParams, setSearchParams] = useSearchParams()
  const tagsQuery = useQuery(wordExplorerTagsQueryOptions())
  const initialTagIds = React.useMemo(() => searchParams.getAll("tag"), [])
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(() =>
    Array.from(new Set(initialTagIds)),
  )
  const [sortMode, setSortMode] = React.useState<WordExplorerSortMode>("added")
  const [tagSelectedIndex, setTagSelectedIndex] = React.useState(0)
  const [selectedSidebarTagId, setSelectedSidebarTagId] = React.useState<string | null>(null)
  const [wordSelectedIndex, setWordSelectedIndex] = React.useState(0)
  const [focusTarget, setFocusTarget] = React.useState<FocusTarget>("tags")
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true)
  const [isSidebarOverlayOpen, setIsSidebarOverlayOpen] = React.useState(false)
  const [selectedDetail, setSelectedDetail] = React.useState<{ id: string; word: string } | null>(
    null,
  )
  const [isFetchingDifferentSelection, setIsFetchingDifferentSelection] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const tagsScrollboxRef = React.useRef<ScrollBoxRenderable | null>(null)
  const wordsScrollboxRef = React.useRef<ScrollBoxRenderable | null>(null)

  const tags = tagsQuery.data ?? []
  const wordsQuery = useQuery({
    ...wordExplorerWordsQueryOptions(selectedTagIds, sortMode),
    enabled: selectedTagIds.length > 0,
  })
  const words = wordsQuery.data ?? []
  const selectedWordId = words[wordSelectedIndex]?.wordId ?? null
  const selectedWord = selectedWordId ? getWordFromWordId(selectedWordId) : null
  const detailSelection = selectedWord
    ? {
        query: selectedWord,
        label: selectedWord,
      }
    : null
  const isNarrowTerminal = width < NARROW_TERMINAL_WIDTH
  const isFullScreenOverlay = width < FULLSCREEN_OVERLAY_WIDTH
  const isSplitSidebarVisible = !isNarrowTerminal && isSidebarExpanded
  const isOverlayVisible = isNarrowTerminal && isSidebarOverlayOpen
  const isSidebarVisible = isSplitSidebarVisible || isOverlayVisible
  const detailsContentWidth = getDetailsContentWidth(width, isSplitSidebarVisible)
  const detailsFocused =
    !isDialogOpen && !isOverlayVisible && (!isSplitSidebarVisible || focusTarget === "details")

  React.useEffect(() => {
    setAutocompleteActive(false)

    return () => {
      stopPronunciation()
    }
  }, [setAutocompleteActive])

  React.useEffect(() => {
    setToggleSidebarShortcutHandler(() => {
      if (isNarrowTerminal) {
        setIsSidebarOverlayOpen((currentValue) => {
          const nextValue = !currentValue

          setFocusTarget(nextValue ? "tags" : "details")

          return nextValue
        })
        return
      }

      setIsSidebarExpanded((currentValue) => {
        const nextValue = !currentValue

        setFocusTarget(nextValue ? "tags" : "details")

        return nextValue
      })
    })

    return () => {
      setToggleSidebarShortcutHandler(null)
    }
  }, [isNarrowTerminal, setToggleSidebarShortcutHandler])

  React.useEffect(() => {
    if (isNarrowTerminal) {
      if (!isSidebarOverlayOpen) {
        setFocusTarget("details")
      }

      return
    }

    if (isSidebarOverlayOpen) {
      setIsSidebarOverlayOpen(false)
    }

    if (isSidebarVisible) {
      return
    }

    setFocusTarget("details")
  }, [isNarrowTerminal, isSidebarOverlayOpen, isSidebarVisible])

  React.useEffect(() => {
    if (!tagsQuery.error && !wordsQuery.error) {
      return
    }

    const firstError = tagsQuery.error ?? wordsQuery.error
    setErrorMessage(
      firstError instanceof Error ? firstError.message : "Failed to load explorer data.",
    )
  }, [tagsQuery.error, wordsQuery.error])

  const handleSelectionStateChange = React.useCallback(
    (value: {
      detail: { id: string; word: string } | null
      isFetchingDifferentSelection: boolean
    }) => {
      setSelectedDetail(value.detail)
      setIsFetchingDifferentSelection(value.isFetchingDifferentSelection)
    },
    [],
  )

  const handlePlayPronunciation = React.useCallback(() => {
    if (!selectedWord || !selectedDetail || isFetchingDifferentSelection) {
      return
    }

    setErrorMessage(null)

    void (async () => {
      try {
        const detail = await queryClient.fetchQuery(wordDetailQueryOptions(selectedWord))

        if (!detail) {
          setErrorMessage("No pronunciation available for this word.")
          return
        }

        await playPronunciation(detail)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to play pronunciation.")
      }
    })()
  }, [isFetchingDifferentSelection, queryClient, selectedDetail, selectedWord])

  const setSidebarSelection = React.useCallback(
    (nextIndex: number) => {
      const safeSelectedIndex =
        tags.length === 0 ? 0 : Math.max(0, Math.min(nextIndex, tags.length - 1))

      setTagSelectedIndex(safeSelectedIndex)
      setSelectedSidebarTagId(tags[safeSelectedIndex]?.id ?? null)
    },
    [tags],
  )

  React.useEffect(() => {
    if (tagsQuery.isPending) {
      return
    }

    const existingTagIds = new Set(tags.map((tag) => tag.id))
    const filteredTagIds = selectedTagIds.filter((tagId) => existingTagIds.has(tagId))

    if (filteredTagIds.length !== selectedTagIds.length) {
      setSelectedTagIds(filteredTagIds)
      return
    }

    const nextParams = new URLSearchParams()

    for (const tagId of filteredTagIds) {
      nextParams.append("tag", tagId)
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, selectedTagIds, setSearchParams, tags, tagsQuery.isPending])

  React.useEffect(() => {
    if (tags.length === 0) {
      if (tagSelectedIndex !== 0) {
        setTagSelectedIndex(0)
      }

      if (selectedSidebarTagId !== null) {
        setSelectedSidebarTagId(null)
      }

      return
    }

    if (!selectedSidebarTagId) {
      const fallbackIndex = Math.max(0, Math.min(tagSelectedIndex, tags.length - 1))
      const fallbackTagId = tags[fallbackIndex]?.id ?? null

      if (tagSelectedIndex !== fallbackIndex) {
        setTagSelectedIndex(fallbackIndex)
      }

      if (selectedSidebarTagId !== fallbackTagId) {
        setSelectedSidebarTagId(fallbackTagId)
      }

      return
    }

    const remappedIndex = tags.findIndex((tag) => tag.id === selectedSidebarTagId)

    if (remappedIndex >= 0) {
      if (tagSelectedIndex !== remappedIndex) {
        setTagSelectedIndex(remappedIndex)
      }

      return
    }

    const fallbackIndex = Math.max(0, Math.min(tagSelectedIndex, tags.length - 1))
    const fallbackTagId = tags[fallbackIndex]?.id ?? null

    if (tagSelectedIndex !== fallbackIndex) {
      setTagSelectedIndex(fallbackIndex)
    }

    if (selectedSidebarTagId !== fallbackTagId) {
      setSelectedSidebarTagId(fallbackTagId)
    }
  }, [selectedSidebarTagId, tagSelectedIndex, tags])

  React.useEffect(() => {
    const selectedTag = tags[tagSelectedIndex]

    if (!isSidebarVisible || !selectedTag) {
      return
    }

    tagsScrollboxRef.current?.scrollChildIntoView(getTagItemId(selectedTag.id))
  }, [isSidebarVisible, tagSelectedIndex, tags])

  React.useEffect(() => {
    if (wordSelectedIndex < words.length) {
      return
    }

    setWordSelectedIndex(Math.max(0, words.length - 1))
  }, [wordSelectedIndex, words.length])

  React.useEffect(() => {
    const selectedWord = words[wordSelectedIndex]

    if (!isSidebarVisible || !selectedWord) {
      return
    }

    wordsScrollboxRef.current?.scrollChildIntoView(getWordItemId(selectedWord.wordId))
  }, [isSidebarVisible, wordSelectedIndex, words])

  const toggleSelectedTag = React.useCallback(() => {
    const tag = tags[tagSelectedIndex]

    if (!tag) {
      return
    }

    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(tag.id)
        ? currentTagIds.filter((id) => id !== tag.id)
        : [...currentTagIds, tag.id],
    )
    setWordSelectedIndex(0)
  }, [tagSelectedIndex, tags])

  useKeyboard((key) => {
    if (isDialogOpen) {
      return
    }

    if (key.name === "tab") {
      setFocusTarget((currentTarget) => {
        const order: FocusTarget[] = isNarrowTerminal
          ? isOverlayVisible
            ? ["tags", "words"]
            : ["details"]
          : isSidebarVisible
            ? ["tags", "words", "details"]
            : ["details"]
        const currentIndex = order.indexOf(currentTarget)
        const delta = key.shift ? -1 : 1
        const nextIndex = (currentIndex + delta + order.length) % order.length
        return order[nextIndex] ?? "details"
      })
      return
    }

    if (key.name === "escape") {
      navigate("/")
      return
    }

    if (key.ctrl && key.name === "e") {
      if (!selectedWordId || !selectedDetail || isFetchingDifferentSelection) {
        return
      }

      void (async () => {
        try {
          const wordExample = await queryClient.fetchQuery(wordExampleQueryOptions(selectedWordId))

          await dialog.prompt({
            size: "large",
            content: (context) => (
              <WordExampleDialog
                dialogId={context.dialogId}
                wordId={selectedWordId}
                word={selectedDetail.word}
                initialValue={wordExample?.text ?? ""}
                resolve={context.resolve}
                dismiss={context.dismiss}
              />
            ),
          })
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load example.")
        }
      })()

      return
    }

    if (key.ctrl && key.name === "t") {
      if (!selectedWordId || !selectedDetail || isFetchingDifferentSelection) {
        return
      }

      void dialog.prompt({
        size: "large",
        content: (context) => (
          <WordExplorerTagsDialog
            detail={selectedDetail}
            dialogId={context.dialogId}
            dismiss={context.dismiss}
          />
        ),
      })

      return
    }

    if (key.ctrl && key.name === "p") {
      handlePlayPronunciation()
      return
    }

    if (focusTarget === "tags" && isSidebarVisible) {
      if (key.name === "up") {
        key.preventDefault()
        key.stopPropagation()
        setSidebarSelection(getNextIndex(tagSelectedIndex, -1, tags.length))
        return
      }

      if (key.name === "down") {
        key.preventDefault()
        key.stopPropagation()
        setSidebarSelection(getNextIndex(tagSelectedIndex, 1, tags.length))
        return
      }

      if (key.name === "space") {
        toggleSelectedTag()
        return
      }

      if (key.ctrl || key.meta || key.option) {
        return
      }

      const typedCharacter = getPrintableCharacter(key.name, key.sequence)

      if (typedCharacter.length !== 1 || tags.length === 0) {
        return
      }

      const nextIndex = findNextJumpMatch(tags, tagSelectedIndex, typedCharacter)

      if (nextIndex !== tagSelectedIndex) {
        setSidebarSelection(nextIndex)
      }

      return
    }

    if (focusTarget === "words" && isSidebarVisible) {
      if (key.name === "up") {
        key.preventDefault()
        key.stopPropagation()
        setWordSelectedIndex((currentIndex) => getNextIndex(currentIndex, -1, words.length))
        return
      }

      if (key.name === "down") {
        key.preventDefault()
        key.stopPropagation()
        setWordSelectedIndex((currentIndex) => getNextIndex(currentIndex, 1, words.length))
        return
      }

      if (key.name === "s" && key.ctrl && !key.meta && !key.option) {
        setSortMode((currentMode) => (currentMode === "alphabetical" ? "added" : "alphabetical"))
        setWordSelectedIndex(0)
        return
      }

      if (key.ctrl || key.meta || key.option) {
        return
      }

      const typedCharacter = getPrintableCharacter(key.name, key.sequence)
      const wordLabels = words.map((item) => getWordFromWordId(item.wordId))

      if (typedCharacter.length !== 1 || wordLabels.length === 0) {
        return
      }

      setWordSelectedIndex((currentIndex) =>
        findNextWordJumpMatch(wordLabels, currentIndex, typedCharacter),
      )
    }
  })

  return (
    <box
      width="100%"
      height="100%"
      flexDirection={isSplitSidebarVisible ? "row" : "column"}
      gap={2}
    >
      {isSplitSidebarVisible ? (
        <box width={SIDEBAR_WIDTH} flexDirection="column" gap={1} minHeight={0}>
          <SidebarContent
            focusTarget={focusTarget}
            selectedTagIds={selectedTagIds}
            sortMode={sortMode}
            tagSelectedIndex={tagSelectedIndex}
            tags={tags}
            tagsScrollboxRef={tagsScrollboxRef}
            wordSelectedIndex={wordSelectedIndex}
            words={words}
            wordsScrollboxRef={wordsScrollboxRef}
          />
        </box>
      ) : null}

      <box
        flexGrow={1}
        minHeight={0}
        paddingX={2}
        paddingY={1}
        backgroundColor={detailsFocused ? draculaColors.currentLine : draculaColors.background}
      >
        <DetailsView
          contentWidth={detailsContentWidth}
          selection={detailSelection}
          focused={detailsFocused}
          tagHintText="Ctrl+t Add tags"
          emptyStateMessage="Select one or more tags to list words."
          onSelectionStateChange={handleSelectionStateChange}
        />
      </box>

      {isOverlayVisible ? (
        <box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          right={isFullScreenOverlay ? 0 : undefined}
          width={isFullScreenOverlay ? undefined : SIDEBAR_WIDTH}
          zIndex={200}
        >
          <box
            width="100%"
            height="100%"
            flexDirection="column"
            gap={1}
            minHeight={0}
            backgroundColor={draculaColors.background}
            zIndex={200}
          >
            <SidebarContent
              focusTarget={focusTarget}
              selectedTagIds={selectedTagIds}
              sortMode={sortMode}
              tagSelectedIndex={tagSelectedIndex}
              tags={tags}
              tagsScrollboxRef={tagsScrollboxRef}
              wordSelectedIndex={wordSelectedIndex}
              words={words}
              wordsScrollboxRef={wordsScrollboxRef}
            />
          </box>
        </box>
      ) : null}

      {errorMessage ? (
        <box position="absolute" bottom={0} right={0} border borderStyle="rounded" paddingX={1}>
          <text>
            <span fg={homeScreenTheme.errorText}>{errorMessage}</span>
          </text>
        </box>
      ) : null}
    </box>
  )
}
