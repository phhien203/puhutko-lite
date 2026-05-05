import { useDialog, useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import React from "react"
import { useOutletContext } from "react-router"

import type { WiktionarySearchItem } from "@puhutko/shared"
import { searchFinnishWiktionaryEntries } from "@puhutko/wiktionary"
import { draculaColors, homeScreenTheme } from "../../theme/colors"
import { useWordExample } from "../../providers/word-example-provider"
import { DetailsView } from "../common/details-view"
import { WordExampleDialog } from "../common/word-example/word-example-dialog"
import { TagsManagerDialog } from "../common/word-tags/tags-manager-dialog"
import { Autocomplete } from "./components/autocomplete"
import { RecentSearches } from "./components/recent-searches"
import { NARROW_TERMINAL_WIDTH, SIDEBAR_WIDTH } from "./word-search.constants"
import { initialWordSearchState, wordSearchReducer } from "./word-search.reducer"
import type { TagsManagerDialogWord, WordSearchOutletContext } from "./word-search.types"
import { addRecentSearch } from "./word-search.utils"

export function WordSearch() {
  const dialog = useDialog()
  const { getWordExample } = useWordExample()
  const { setAutocompleteActive } = useOutletContext<WordSearchOutletContext>()
  const { width } = useTerminalDimensions()
  const isDialogOpen = useDialogState((state) => state.isOpen)

  const [query, setQuery] = React.useState("")
  const [recentSearches, setRecentSearches] = React.useState<WiktionarySearchItem[]>([])
  const [recentSelectedIndex, setRecentSelectedIndex] = React.useState<number | null>(null)
  const [selectedItem, setSelectedItem] = React.useState<WiktionarySearchItem | null>(null)
  const [selectedDetail, setSelectedDetail] = React.useState<TagsManagerDialogWord | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [state, dispatch] = React.useReducer(wordSearchReducer, initialWordSearchState)

  const isNarrowTerminal = width < NARROW_TERMINAL_WIDTH
  const isSidebarVisible = !isNarrowTerminal && state.isSidebarExpanded
  const autocompleteFocused = isSidebarVisible && state.focusTarget === "autocomplete"
  const recentFocused = isSidebarVisible && state.focusTarget === "recent"
  const detailsFocused = !isSidebarVisible || state.focusTarget === "details"

  const handleAutocompleteActiveChange = React.useCallback(
    (active: boolean) => {
      dispatch({ type: "autocomplete/set-active", active })
      setAutocompleteActive(active)
    },
    [setAutocompleteActive],
  )

  const handleQueryChange = React.useCallback((nextValue: string) => {
    setQuery(nextValue)
    setErrorMessage(null)
  }, [])

  const handleError = React.useCallback((error: unknown) => {
    if (error instanceof Error && error.message.length > 0) {
      setErrorMessage(error.message)
      return
    }

    setErrorMessage("Failed to load suggestions.")
  }, [])

  const handleAutocompleteSelect = React.useCallback((item: WiktionarySearchItem) => {
    setSelectedItem(item)
    setRecentSearches((currentItems) => addRecentSearch(currentItems, item))
    setRecentSelectedIndex(0)
  }, [])

  const handleRecentSelectedIndexChange = React.useCallback((index: number | null) => {
    setRecentSelectedIndex(index)
  }, [])

  const handleRecentSelect = React.useCallback((item: WiktionarySearchItem) => {
    setSelectedItem(item)
  }, [])

  const handleDetailChange = React.useCallback((detail: TagsManagerDialogWord | null) => {
    setSelectedDetail(detail)
  }, [])

  React.useEffect(() => {
    dispatch({ type: "layout/sync", isSidebarVisible, isNarrowTerminal })
  }, [isNarrowTerminal, isSidebarVisible])

  React.useEffect(() => {
    return () => {
      setAutocompleteActive(false)
    }
  }, [setAutocompleteActive])

  React.useEffect(() => {
    if (recentSearches.length === 0) {
      setRecentSelectedIndex(null)
      return
    }

    setRecentSelectedIndex((currentIndex) => {
      if (currentIndex === null) {
        return null
      }

      return Math.min(currentIndex, recentSearches.length - 1)
    })
  }, [recentSearches])

  useKeyboard((key) => {
    if (isDialogOpen) {
      return
    }

    if (key.ctrl && key.name === "t") {
      if (!selectedItem || !selectedDetail) {
        return
      }

      void dialog.prompt({
        size: "large",
        content: (context) => (
          <TagsManagerDialog
            detail={selectedDetail}
            dialogId={context.dialogId}
            dismiss={context.dismiss}
          />
        ),
      })
      return
    }

    if (key.ctrl && key.name === "e") {
      if (!selectedDetail) {
        return
      }

      void (async () => {
        try {
          const wordExample = await getWordExample(selectedDetail.id)

          await dialog.prompt({
            size: "large",
            content: (context) => (
              <WordExampleDialog
                dialogId={context.dialogId}
                wordId={selectedDetail.id}
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

    if (key.name === "tab") {
      dispatch({ type: "focus/next", backwards: key.shift, isNarrowTerminal })
      return
    }

    if (key.name === "b" && !key.shift && !key.ctrl && !key.meta && !key.option) {
      dispatch({ type: "sidebar/toggle", isNarrowTerminal })
    }
  })

  return (
    <box width="100%" height="100%" flexDirection={isSidebarVisible ? "row" : "column"} gap={2}>
      {isSidebarVisible ? (
        <box width={SIDEBAR_WIDTH} flexDirection="column" gap={1} minHeight={0}>
          <box
            backgroundColor={
              autocompleteFocused ? draculaColors.currentLine : draculaColors.background
            }
            flexDirection="column"
            zIndex={state.isAutocompleteActive ? 100 : 0}
          >
            <Autocomplete
              value={query}
              onChange={handleQueryChange}
              onSelect={handleAutocompleteSelect}
              focused={autocompleteFocused}
              maxVisibleItems={20}
              placeholder="Enter a Finnish word..."
              loaderFn={searchFinnishWiktionaryEntries}
              onError={handleError}
              onActiveChange={handleAutocompleteActiveChange}
            />
          </box>

          <box flexGrow={1} minHeight={0}>
            <RecentSearches
              items={recentSearches}
              selectedIndex={recentSelectedIndex}
              onSelectedIndexChange={handleRecentSelectedIndexChange}
              onSelect={handleRecentSelect}
              focused={recentFocused}
            />
          </box>
        </box>
      ) : null}

      <box
        flexGrow={1}
        minHeight={0}
        padding={1}
        backgroundColor={detailsFocused ? draculaColors.currentLine : draculaColors.background}
      >
        <DetailsView
          item={selectedItem}
          focused={detailsFocused}
          onDetailChange={handleDetailChange}
        />
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
