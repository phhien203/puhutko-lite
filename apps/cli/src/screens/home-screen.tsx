import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import type { WiktionarySearchItem } from "@puhutko/shared"
import { searchFinnishWiktionaryEntries } from "@puhutko/wiktionary"
import React from "react"
import { useOutletContext } from "react-router"
import { Autocomplete } from "../components/autocomplete"
import { DetailsView } from "../components/details-view"
import { RecentSearches } from "../components/recent-searches"
import { homeScreenTheme } from "../theme/colors"

type HomeScreenOutletContext = {
  setAutocompleteActive: (active: boolean) => void
}

type FocusTarget = "autocomplete" | "recent" | "details"

type HomeScreenState = {
  focusTarget: FocusTarget
  isSidebarExpanded: boolean
  isAutocompleteActive: boolean
}

type HomeScreenAction =
  | { type: "autocomplete/set-active"; active: boolean }
  | { type: "sidebar/toggle"; isNarrowTerminal: boolean }
  | { type: "focus/next"; backwards: boolean; isNarrowTerminal: boolean }
  | { type: "layout/sync"; isSidebarVisible: boolean; isNarrowTerminal: boolean }

const SIDEBAR_WIDTH = 40
const NARROW_TERMINAL_WIDTH = 90
const RECENT_SEARCHES = Array.from(
  { length: 100 },
  (_, index) => `Recent search ${index + 1}`,
)

function getNextFocusTarget(current: FocusTarget, backwards: boolean): FocusTarget {
  const order: FocusTarget[] = ["autocomplete", "recent", "details"]
  const currentIndex = order.indexOf(current)
  const step = backwards ? -1 : 1
  const nextIndex = (currentIndex + step + order.length) % order.length

  return order[nextIndex] ?? "autocomplete"
}

const initialState: HomeScreenState = {
  focusTarget: "autocomplete",
  isSidebarExpanded: true,
  isAutocompleteActive: false,
}

function homeScreenReducer(state: HomeScreenState, action: HomeScreenAction): HomeScreenState {
  switch (action.type) {
    case "autocomplete/set-active":
      return {
        ...state,
        isAutocompleteActive: action.active,
      }
    case "sidebar/toggle":
      if (action.isNarrowTerminal || state.focusTarget === "autocomplete" || state.isAutocompleteActive) {
        return state
      }

      return {
        ...state,
        focusTarget: state.isSidebarExpanded ? "details" : state.focusTarget,
        isSidebarExpanded: !state.isSidebarExpanded,
      }
    case "focus/next":
      if (action.isNarrowTerminal || !state.isSidebarExpanded) {
        if (state.focusTarget === "details") {
          return state
        }

        return {
          ...state,
          focusTarget: "details",
        }
      }

      return {
        ...state,
        focusTarget: getNextFocusTarget(state.focusTarget, action.backwards),
      }
    case "layout/sync":
      if (!action.isSidebarVisible || action.isNarrowTerminal) {
        if (state.focusTarget === "details") {
          return state
        }

        return {
          ...state,
          focusTarget: "details",
        }
      }

      return state
    default:
      return state
  }
}

export function HomeScreen() {
  const { setAutocompleteActive } = useOutletContext<HomeScreenOutletContext>()
  const { width } = useTerminalDimensions()
  const [query, setQuery] = React.useState("")
  const [selectedItem, setSelectedItem] = React.useState<WiktionarySearchItem | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [state, dispatch] = React.useReducer(homeScreenReducer, initialState)

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

  React.useEffect(() => {
    dispatch({ type: "layout/sync", isSidebarVisible, isNarrowTerminal })
  }, [isNarrowTerminal, isSidebarVisible])

  React.useEffect(() => {
    return () => {
      setAutocompleteActive(false)
    }
  }, [setAutocompleteActive])

  useKeyboard((key) => {
    if (key.name === "tab") {
      dispatch({ type: "focus/next", backwards: key.shift, isNarrowTerminal })
      return
    }

    if (key.name === "b" && !key.shift && !key.ctrl && !key.meta && !key.option) {
      dispatch({ type: "sidebar/toggle", isNarrowTerminal })
    }
  })

  return (
    <box width="100%" height="100%" flexDirection={isSidebarVisible ? "row" : "column"} gap={1}>
      {isSidebarVisible ? (
        <box width={SIDEBAR_WIDTH} flexDirection="column" gap={1} minHeight={0}>
          <box
            backgroundColor={autocompleteFocused ? homeScreenTheme.panelFocusedBackground : undefined}
            flexDirection="column"
            zIndex={state.isAutocompleteActive ? 100 : 0}
          >
            <Autocomplete
              value={query}
              onChange={handleQueryChange}
              onSelect={setSelectedItem}
              focused={autocompleteFocused}
              maxVisibleItems={10}
              placeholder="Enter a Finnish word..."
              loaderFn={searchFinnishWiktionaryEntries}
              onError={handleError}
              onActiveChange={handleAutocompleteActiveChange}
            />
          </box>

          <box flexGrow={1} minHeight={0}>
            <RecentSearches items={RECENT_SEARCHES} focused={recentFocused} />
          </box>
        </box>
      ) : null}

      <box
        flexGrow={1}
        minHeight={0}
      >
        <DetailsView item={selectedItem} focused={detailsFocused} />
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
