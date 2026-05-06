import { useDialog, useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { findNextJumpMatch, type WordExplorerSortMode } from "@puhutko/word-tags"
import React from "react"
import { useOutletContext, useSearchParams } from "react-router"

import type { WordDetail } from "@puhutko/shared"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { WordExampleDialog } from "../common/word-example/word-example-dialog"
import { wordDetailQueryOptions } from "../common/details-view.queries"
import { WordDetailView } from "../common/word-detail/word-detail"
import { wordExampleQueryOptions } from "../common/word-detail/word-detail.queries"
import { NARROW_TERMINAL_WIDTH, SIDEBAR_WIDTH } from "../word-search/word-search.constants"
import type { WordSearchOutletContext } from "../word-search/word-search.types"
import {
  wordExplorerTagsQueryOptions,
  wordExplorerWordsQueryOptions,
} from "./word-explorer.queries"

type FocusTarget = "tags" | "words" | "details"

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

export function WordExplorer() {
  const dialog = useDialog()
  const isDialogOpen = useDialogState((state) => state.isOpen)
  const queryClient = useQueryClient()
  const { setAutocompleteActive } = useOutletContext<WordSearchOutletContext>()
  const { width } = useTerminalDimensions()
  const [searchParams, setSearchParams] = useSearchParams()
  const tagsQuery = useQuery(wordExplorerTagsQueryOptions())
  const initialTagIds = React.useMemo(() => searchParams.getAll("tag"), [])
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(() => Array.from(new Set(initialTagIds)))
  const [sortMode, setSortMode] = React.useState<WordExplorerSortMode>("alphabetical")
  const [tagSelectedIndex, setTagSelectedIndex] = React.useState(0)
  const [wordSelectedIndex, setWordSelectedIndex] = React.useState(0)
  const [focusTarget, setFocusTarget] = React.useState<FocusTarget>("tags")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const tags = tagsQuery.data ?? []
  const wordsQuery = useQuery({
    ...wordExplorerWordsQueryOptions(selectedTagIds, sortMode),
    enabled: selectedTagIds.length > 0,
  })
  const words = wordsQuery.data ?? []
  const selectedWordId = words[wordSelectedIndex]?.wordId ?? null
  const selectedWord = selectedWordId ? getWordFromWordId(selectedWordId) : null
  const detailQuery = useQuery({
    ...wordDetailQueryOptions(selectedWord ?? ""),
    enabled: Boolean(selectedWord),
    placeholderData: (previousData) => previousData,
  })
  const detail: WordDetail | null = detailQuery.data ?? null
  const isNarrowTerminal = width < NARROW_TERMINAL_WIDTH
  const isSidebarVisible = !isNarrowTerminal

  React.useEffect(() => {
    setAutocompleteActive(false)
  }, [setAutocompleteActive])

  React.useEffect(() => {
    if (!tagsQuery.error && !wordsQuery.error && !detailQuery.error) {
      return
    }

    const firstError = tagsQuery.error ?? wordsQuery.error ?? detailQuery.error
    setErrorMessage(firstError instanceof Error ? firstError.message : "Failed to load explorer data.")
  }, [detailQuery.error, tagsQuery.error, wordsQuery.error])

  React.useEffect(() => {
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
  }, [searchParams, selectedTagIds, setSearchParams, tags])

  React.useEffect(() => {
    if (tagSelectedIndex < tags.length) {
      return
    }

    setTagSelectedIndex(Math.max(0, tags.length - 1))
  }, [tagSelectedIndex, tags.length])

  React.useEffect(() => {
    if (wordSelectedIndex < words.length) {
      return
    }

    setWordSelectedIndex(Math.max(0, words.length - 1))
  }, [wordSelectedIndex, words.length])

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
        const order: FocusTarget[] = ["tags", "words", "details"]
        const currentIndex = order.indexOf(currentTarget)
        const delta = key.shift ? -1 : 1
        const nextIndex = (currentIndex + delta + order.length) % order.length
        return order[nextIndex] ?? "tags"
      })
      return
    }

    if (key.ctrl && key.name === "e") {
      if (!selectedWordId || !detail || detailQuery.isFetching) {
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
                word={detail.word}
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

    if (focusTarget === "tags") {
      if (key.name === "up") {
        setTagSelectedIndex((currentIndex) => getNextIndex(currentIndex, -1, tags.length))
        return
      }

      if (key.name === "down") {
        setTagSelectedIndex((currentIndex) => getNextIndex(currentIndex, 1, tags.length))
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

      setTagSelectedIndex((currentIndex) => findNextJumpMatch(tags, currentIndex, typedCharacter))
      return
    }

    if (focusTarget === "words") {
      if (key.name === "up") {
        setWordSelectedIndex((currentIndex) => getNextIndex(currentIndex, -1, words.length))
        return
      }

      if (key.name === "down") {
        setWordSelectedIndex((currentIndex) => getNextIndex(currentIndex, 1, words.length))
        return
      }

      if (key.name === "s" && key.ctrl && !key.meta && !key.option) {
        setSortMode((currentMode) =>
          currentMode === "alphabetical" ? "added" : "alphabetical",
        )
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
    <box width="100%" height="100%" flexDirection={isSidebarVisible ? "row" : "column"} gap={2}>
      <box width={isSidebarVisible ? SIDEBAR_WIDTH : "100%"} flexDirection="column" gap={1} minHeight={0}>
        <box
          flexGrow={1}
          minHeight={0}
          backgroundColor={focusTarget === "tags" ? draculaColors.currentLine : draculaColors.background}
          flexDirection="column"
        >
          <text marginX={2} marginY={1}>
            <strong>Tags</strong>
            <span fg={homeScreenTheme.mutedText}>  [Space] Toggle</span>
          </text>
          <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focusTarget === "tags"}>
            <box width="100%" flexDirection="column">
              {tags.map((tag, index) => {
                const isSelected = index === tagSelectedIndex
                const isActive = selectedTagIds.includes(tag.id)

                return (
                  <box
                    key={tag.id}
                    width="100%"
                    paddingX={2}
                    backgroundColor={isSelected ? draculaColors.purple : undefined}
                  >
                    <text>
                      <strong>{isActive ? "[✔︎]" : "[ ]"}</strong> {tag.name}
                    </text>
                  </box>
                )
              })}
            </box>
          </scrollbox>
        </box>

        <box
          flexGrow={1}
          minHeight={0}
          backgroundColor={focusTarget === "words" ? draculaColors.currentLine : draculaColors.background}
          flexDirection="column"
        >
          <text marginX={2} marginY={1}>
            <strong>Words</strong>
            <span fg={homeScreenTheme.mutedText}>
              {`  [Ctrl+S] Sort: ${sortMode === "alphabetical" ? "A-Z" : "Added"}`}
            </span>
          </text>
          <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focusTarget === "words"}>
            <box width="100%" flexDirection="column">
              {words.map((item, index) => {
                const isSelected = index === wordSelectedIndex

                return (
                  <box
                    key={item.wordId}
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

      <box
        flexGrow={1}
        minHeight={0}
        paddingY={1}
        backgroundColor={focusTarget === "details" ? draculaColors.currentLine : draculaColors.background}
      >
        <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focusTarget === "details"}>
          <box width="100%" flexDirection="column" paddingX={2}>
            {selectedWordId ? (
              <WordDetailView
                detail={detail}
                focused={focusTarget === "details"}
                showTagManagementHint={false}
              />
            ) : null}
            {!selectedWordId ? (
              <text>
                <span fg={homeScreenTheme.mutedText}>Select one or more tags to list words.</span>
              </text>
            ) : null}
          </box>
        </scrollbox>
      </box>

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
