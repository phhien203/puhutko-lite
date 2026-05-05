import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import React from "react"
import { useOutletContext } from "react-router"
import { Autocomplete } from "../components/autocomplete"
import { DetailsView } from "../components/details-view"
import { RecentSearches } from "../components/recent-searches"

type HomeScreenOutletContext = {
  setAutocompleteActive: (active: boolean) => void
}

type WiktionarySearchItem = {
  label: string
  value: string
  description?: string
  url?: string
}

type FocusTarget = "autocomplete" | "recent" | "details"

type WiktionaryOpenSearchResponse = [string, string[], string[], string[]]

type WiktionaryPageContentResponse = {
  query?: {
    pages?: Array<{
      title?: string
      revisions?: Array<{
        slots?: {
          main?: {
            content?: string
          }
        }
      }>
    }>
  }
}

const SIDEBAR_WIDTH = 40
const NARROW_TERMINAL_WIDTH = 90
const RECENT_SEARCHES = Array.from(
  { length: 100 },
  (_, index) => `Recent search ${index + 1}`,
)

function buildSearchUrl(query: string) {
  const params = new URLSearchParams({
    action: "opensearch",
    search: query,
    namespace: "0",
    limit: "25",
    format: "json",
    origin: "*",
  })

  return `https://en.wiktionary.org/w/api.php?${params.toString()}`
}

function buildPageContentUrl(words: string[]) {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: words.join("|"),
    rvprop: "content",
    rvslots: "main",
    format: "json",
    formatversion: "2",
    origin: "*",
  })

  return `https://en.wiktionary.org/w/api.php?${params.toString()}`
}

function normalizeWord(word: string) {
  return word.trim().toLocaleLowerCase("fi-FI")
}

function isOpenSearchResponse(value: unknown): value is WiktionaryOpenSearchResponse {
  return Array.isArray(value) && Array.isArray(value[1])
}

function isPageContentResponse(value: unknown): value is WiktionaryPageContentResponse {
  return typeof value === "object" && value !== null && "query" in value
}

function hasFinnishSection(content: string) {
  return /^==\s*Finnish\s*==\s*$/m.test(content)
}

function getNextFocusTarget(current: FocusTarget, backwards: boolean): FocusTarget {
  const order: FocusTarget[] = ["autocomplete", "recent", "details"]
  const currentIndex = order.indexOf(current)
  const step = backwards ? -1 : 1
  const nextIndex = (currentIndex + step + order.length) % order.length

  return order[nextIndex] ?? "autocomplete"
}

export function HomeScreen() {
  const { setAutocompleteActive } = useOutletContext<HomeScreenOutletContext>()
  const { width } = useTerminalDimensions()
  const [query, setQuery] = React.useState("")
  const [selectedItem, setSelectedItem] = React.useState<WiktionarySearchItem | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isAutocompleteActive, setIsAutocompleteActive] = React.useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true)
  const [focusTarget, setFocusTarget] = React.useState<FocusTarget>("autocomplete")
  const isNarrowTerminal = width < NARROW_TERMINAL_WIDTH
  const isSidebarVisible = !isNarrowTerminal && isSidebarExpanded
  const autocompleteFocused = isSidebarVisible && focusTarget === "autocomplete"
  const recentFocused = isSidebarVisible && focusTarget === "recent"
  const detailsFocused = !isSidebarVisible || focusTarget === "details"

  const loaderFn = React.useCallback(async (nextQuery: string, signal: AbortSignal) => {
    const normalizedQuery = normalizeWord(nextQuery)

    if (normalizedQuery.length < 2) {
      return []
    }

    const response = await fetch(buildSearchUrl(normalizedQuery), { signal })

    if (!response.ok) {
      return []
    }

    const payload = await response.json()

    if (!isOpenSearchResponse(payload)) {
      return []
    }

    const [, titles, descriptions = [], urls = []] = payload
    const candidates = titles
      .map((title, index) => ({
        label: title,
        value: title,
        normalizedValue: normalizeWord(title),
        description: descriptions[index],
        url: urls[index],
      }))
      .filter((item) => item.normalizedValue.startsWith(normalizedQuery))

    if (candidates.length === 0) {
      return []
    }

    const pageContentResponse = await fetch(buildPageContentUrl(candidates.map((item) => item.value)), {
      signal,
    })

    if (!pageContentResponse.ok) {
      return []
    }

    const pageContentPayload = await pageContentResponse.json()

    if (!isPageContentResponse(pageContentPayload)) {
      return []
    }

    const finnishWords = new Set<string>()

    for (const page of pageContentPayload.query?.pages ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content ?? ""

      if (page.title && hasFinnishSection(content)) {
        finnishWords.add(page.title)
      }
    }

    return candidates
      .filter((item) => finnishWords.has(item.value))
      .slice(0, 10)
      .map(({ normalizedValue: _normalizedValue, ...item }) => item)
  }, [])

  const handleAutocompleteActiveChange = React.useCallback(
    (active: boolean) => {
      setIsAutocompleteActive(active)
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
    if (isNarrowTerminal && focusTarget !== "details") {
      setFocusTarget("details")
      return
    }

    if (!isSidebarVisible && focusTarget !== "details") {
      setFocusTarget("details")
    }
  }, [focusTarget, isNarrowTerminal, isSidebarVisible])

  React.useEffect(() => {
    return () => {
      setAutocompleteActive(false)
    }
  }, [setAutocompleteActive])

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocusTarget((current) => {
        if (isNarrowTerminal) {
          return "details"
        }

        return getNextFocusTarget(current, key.shift)
      })
      return
    }

    if (key.name === "b" && !key.shift && !key.ctrl && !key.meta && !key.option) {
      if (isNarrowTerminal || focusTarget === "autocomplete" || isAutocompleteActive) {
        return
      }

      setIsSidebarExpanded((current) => !current)
    }
  })

  return (
    <box width="100%" height="100%" flexDirection={isSidebarVisible ? "row" : "column"} gap={1}>
      {isSidebarVisible ? (
        <box width={SIDEBAR_WIDTH} flexDirection="column" gap={1} minHeight={0}>
          <box
            border
            borderStyle="rounded"
            borderColor={autocompleteFocused ? "green" : "gray"}
            backgroundColor={autocompleteFocused ? "#112211" : undefined}
            flexDirection="column"
            padding={1}
            zIndex={isAutocompleteActive ? 100 : 0}
          >
            <Autocomplete
              value={query}
              onChange={handleQueryChange}
              onSelect={setSelectedItem}
              focused={autocompleteFocused}
              maxVisibleItems={10}
              loaderFn={loaderFn}
              onError={handleError}
              onActiveChange={handleAutocompleteActiveChange}
              placeholder="Enter a Finnish word..."
            />
          </box>

          <box flexGrow={1} minHeight={0}>
            <RecentSearches items={RECENT_SEARCHES} focused={recentFocused} />
          </box>
        </box>
      ) : null}

      <box flexGrow={1} minHeight={0}>
        <DetailsView item={selectedItem} focused={detailsFocused} />
      </box>

      {errorMessage ? (
        <box position="absolute" bottom={0} right={0} border borderStyle="rounded" paddingX={1}>
          <text>
            <span fg="red">{errorMessage}</span>
          </text>
        </box>
      ) : null}
    </box>
  )
}
