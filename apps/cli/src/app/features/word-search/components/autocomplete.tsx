import { RenderableEvents, type InputRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import React from "react"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"
import { useDebounce } from "../../../hooks/use-debounce"

type AutocompleteItem = { label: string; value: string }

type AutocompleteProps<T> = {
  value: string
  onChange: (value: string) => void
  onSelect: (item: T) => void
  focused?: boolean
  loaderFn: (query: string, signal: AbortSignal) => Promise<T[]>
  createItemFromValue?: (value: string) => T
  getItemKey?: (item: T) => string
  getItemDescription?: (item: T) => string | undefined
  onError?: (error: unknown) => void
  onActiveChange?: (active: boolean) => void
  placeholder?: string
  debounceMs?: number
  minQueryLength?: number
  maxVisibleItems?: number
  autoHighlightFirst?: boolean
  allowFreeTextSubmit?: boolean
}

type AutocompleteState<T> = {
  isFocused: boolean
  isOpen: boolean
  isLoading: boolean
  items: T[]
  highlightedKey: string | null
  wasDismissedByEscape: boolean
  requestedFocus: boolean
}

type AutocompleteAction<T> =
  | { type: "FOCUS" }
  | { type: "BLUR" }
  | { type: "REQUEST_FOCUS"; focused: boolean }
  | { type: "INPUT_CHANGED" }
  | { type: "LOAD_START" }
  | {
      type: "LOAD_SUCCESS"
      items: T[]
      getItemKey: (item: T) => string
      autoHighlightFirst: boolean
      maxVisibleItems: number
    }
  | { type: "LOAD_ERROR" }
  | { type: "CLEAR_RESULTS" }
  | { type: "MOVE_UP"; visibleItems: T[]; getItemKey: (item: T) => string }
  | { type: "MOVE_DOWN"; visibleItems: T[]; getItemKey: (item: T) => string }
  | { type: "ESCAPE" }
  | { type: "SELECT" }

function getVisibleItems<T>(items: T[], maxVisibleItems: number) {
  return items.slice(0, maxVisibleItems)
}

function getNextHighlightedKey<T>(
  direction: "up" | "down",
  visibleItems: T[],
  highlightedKey: string | null,
  getItemKey: (item: T) => string,
) {
  if (visibleItems.length === 0) {
    return null
  }

  const fallbackIndex = direction === "down" ? 0 : visibleItems.length - 1
  const currentIndex =
    highlightedKey === null
      ? -1
      : visibleItems.findIndex((item) => getItemKey(item) === highlightedKey)

  if (currentIndex === -1) {
    return getItemKey(visibleItems[fallbackIndex])
  }

  const nextIndex =
    direction === "down"
      ? (currentIndex + 1) % visibleItems.length
      : (currentIndex - 1 + visibleItems.length) % visibleItems.length

  return getItemKey(visibleItems[nextIndex])
}

function createInitialState<T>(): AutocompleteState<T> {
  return {
    isFocused: false,
    isOpen: false,
    isLoading: false,
    items: [],
    highlightedKey: null,
    wasDismissedByEscape: false,
    requestedFocus: true,
  }
}

function autocompleteReducer<T>(
  state: AutocompleteState<T>,
  action: AutocompleteAction<T>,
): AutocompleteState<T> {
  switch (action.type) {
    case "FOCUS":
      return {
        ...state,
        isFocused: true,
        isOpen: state.items.length > 0 && !state.wasDismissedByEscape,
      }
    case "BLUR":
      return {
        ...state,
        isFocused: false,
        isOpen: false,
        highlightedKey: null,
        requestedFocus: false,
      }
    case "REQUEST_FOCUS":
      return {
        ...state,
        requestedFocus: action.focused,
      }
    case "INPUT_CHANGED":
      return {
        ...state,
        isOpen: false,
        highlightedKey: null,
        wasDismissedByEscape: false,
      }
    case "LOAD_START":
      return {
        ...state,
        isLoading: true,
      }
    case "LOAD_SUCCESS": {
      const visibleItems = getVisibleItems(action.items, action.maxVisibleItems)
      const highlightedItem = visibleItems.find(
        (item) => action.getItemKey(item) === state.highlightedKey,
      )
      const highlightedKey = highlightedItem
        ? action.getItemKey(highlightedItem)
        : action.autoHighlightFirst && visibleItems.length > 0
          ? action.getItemKey(visibleItems[0])
          : null

      return {
        ...state,
        isLoading: false,
        items: action.items,
        highlightedKey,
        isOpen: state.isFocused && action.items.length > 0 && !state.wasDismissedByEscape,
      }
    }
    case "LOAD_ERROR":
      return {
        ...state,
        isLoading: false,
        items: [],
        isOpen: false,
        highlightedKey: null,
      }
    case "CLEAR_RESULTS":
      return {
        ...state,
        isLoading: false,
        items: [],
        isOpen: false,
        highlightedKey: null,
        wasDismissedByEscape: false,
      }
    case "MOVE_UP":
      return {
        ...state,
        isOpen: action.visibleItems.length > 0,
        highlightedKey: getNextHighlightedKey(
          "up",
          action.visibleItems,
          state.highlightedKey,
          action.getItemKey,
        ),
        wasDismissedByEscape: false,
      }
    case "MOVE_DOWN":
      return {
        ...state,
        isOpen: action.visibleItems.length > 0,
        highlightedKey: getNextHighlightedKey(
          "down",
          action.visibleItems,
          state.highlightedKey,
          action.getItemKey,
        ),
        wasDismissedByEscape: false,
      }
    case "ESCAPE":
      return {
        ...state,
        isOpen: false,
        highlightedKey: null,
        wasDismissedByEscape: true,
      }
    case "SELECT":
      return {
        ...state,
        isOpen: false,
        highlightedKey: null,
        wasDismissedByEscape: true,
      }
    default:
      return state
  }
}

export function Autocomplete<T extends AutocompleteItem>({
  value,
  onChange,
  onSelect,
  focused,
  loaderFn,
  createItemFromValue,
  getItemKey,
  getItemDescription,
  onError,
  onActiveChange,
  placeholder,
  debounceMs = 300,
  minQueryLength = 2,
  maxVisibleItems = 5,
  autoHighlightFirst = false,
  allowFreeTextSubmit = true,
}: AutocompleteProps<T>) {
  const [state, dispatch] = React.useReducer(autocompleteReducer<T>, undefined, createInitialState)
  const latestRequestIdRef = React.useRef(0)
  const inputRef = React.useRef<InputRenderable | null>(null)
  const pendingProgrammaticValueRef = React.useRef<string | null>(null)
  const debouncedValue = useDebounce(value, debounceMs)
  const isFocusControlled = focused !== undefined
  const itemKeyGetter = React.useCallback(
    (item: T) => getItemKey?.(item) ?? item.value,
    [getItemKey],
  )
  const visibleItems = React.useMemo(
    () => getVisibleItems(state.items, maxVisibleItems),
    [maxVisibleItems, state.items],
  )
  const highlightedItem = React.useMemo(
    () => visibleItems.find((item) => itemKeyGetter(item) === state.highlightedKey) ?? null,
    [itemKeyGetter, state.highlightedKey, visibleItems],
  )
  const active = state.isFocused || state.isOpen || state.isLoading
  const inputShouldBeFocused = isFocusControlled ? focused : state.requestedFocus

  const handleInputChange = React.useCallback(
    (nextValue: string) => {
      if (pendingProgrammaticValueRef.current === nextValue) {
        pendingProgrammaticValueRef.current = null
        return
      }

      dispatch({ type: "INPUT_CHANGED" })
      onChange(nextValue)
    },
    [onChange],
  )

  const selectItem = React.useCallback(
    (item: T) => {
      const nextValue = item.value

      pendingProgrammaticValueRef.current = nextValue
      dispatch({ type: "SELECT" })
      onChange(nextValue)
      onSelect(item)
    },
    [onChange, onSelect],
  )

  const submitCurrentValue = React.useCallback(() => {
    if (state.isOpen && highlightedItem) {
      selectItem(highlightedItem)
      return
    }

    if (state.isOpen && visibleItems.length > 0) {
      selectItem(visibleItems[0])
      return
    }

    if (!allowFreeTextSubmit) {
      return
    }

    const customItem = createItemFromValue
      ? createItemFromValue(value)
      : ({ label: value, value } as unknown as T)

    dispatch({ type: "SELECT" })
    onSelect(customItem)
  }, [
    allowFreeTextSubmit,
    createItemFromValue,
    highlightedItem,
    onSelect,
    selectItem,
    state.isOpen,
    value,
    visibleItems,
  ])

  React.useEffect(() => {
    if (focused === undefined) {
      return
    }

    dispatch({ type: "REQUEST_FOCUS", focused })
  }, [focused])

  React.useEffect(() => {
    if (inputShouldBeFocused) {
      inputRef.current?.focus()
    }
  }, [inputShouldBeFocused])

  React.useEffect(() => {
    if (pendingProgrammaticValueRef.current === value) {
      pendingProgrammaticValueRef.current = null
    }
  }, [value])

  React.useEffect(() => {
    onActiveChange?.(active)
  }, [active, onActiveChange])

  React.useEffect(() => {
    const input = inputRef.current

    if (!input) {
      return
    }

    const handleFocused = () => {
      if (!isFocusControlled) {
        dispatch({ type: "REQUEST_FOCUS", focused: true })
      }

      dispatch({ type: "FOCUS" })
    }

    const handleBlurred = () => {
      if (!isFocusControlled) {
        dispatch({ type: "REQUEST_FOCUS", focused: false })
      }

      dispatch({ type: "BLUR" })
    }

    if (input.focused) {
      dispatch({ type: "FOCUS" })
    }

    input.on(RenderableEvents.FOCUSED, handleFocused)
    input.on(RenderableEvents.BLURRED, handleBlurred)

    return () => {
      input.off(RenderableEvents.FOCUSED, handleFocused)
      input.off(RenderableEvents.BLURRED, handleBlurred)
    }
  }, [isFocusControlled])

  React.useEffect(() => {
    const query = debouncedValue.trim()

    if (query.length < minQueryLength) {
      latestRequestIdRef.current += 1
      dispatch({ type: "CLEAR_RESULTS" })
      return
    }

    const controller = new AbortController()
    const requestId = latestRequestIdRef.current + 1

    latestRequestIdRef.current = requestId
    dispatch({ type: "LOAD_START" })

    void loaderFn(query, controller.signal)
      .then((nextItems) => {
        if (controller.signal.aborted || requestId !== latestRequestIdRef.current) {
          return
        }

        dispatch({
          type: "LOAD_SUCCESS",
          items: nextItems,
          getItemKey: itemKeyGetter,
          autoHighlightFirst,
          maxVisibleItems,
        })
      })
      .catch((error) => {
        if (controller.signal.aborted || requestId !== latestRequestIdRef.current) {
          return
        }

        dispatch({ type: "LOAD_ERROR" })
        onError?.(error)
      })

    return () => {
      controller.abort()
    }
  }, [
    autoHighlightFirst,
    debouncedValue,
    itemKeyGetter,
    loaderFn,
    maxVisibleItems,
    minQueryLength,
    onError,
  ])

  useKeyboard((key) => {
    if (!state.isFocused) {
      return
    }

    const shouldAllowGlobalShortcutBubbling =
      key.ctrl && !key.meta && !key.option && ["b", "c", "g", "x"].includes(key.name)

    if (shouldAllowGlobalShortcutBubbling) {
      return
    }

    if (key.name === "up" && visibleItems.length > 0) {
      dispatch({ type: "MOVE_UP", visibleItems, getItemKey: itemKeyGetter })
      return
    }

    if (key.name === "down" && visibleItems.length > 0) {
      dispatch({ type: "MOVE_DOWN", visibleItems, getItemKey: itemKeyGetter })
      return
    }

    if (key.name === "escape") {
      if (state.isOpen) {
        dispatch({ type: "ESCAPE" })
        return
      }

      if (value.length > 0) {
        handleInputChange("")
        return
      }

      dispatch({ type: "ESCAPE" })

      if (!isFocusControlled) {
        dispatch({ type: "REQUEST_FOCUS", focused: false })
      }

      inputRef.current?.blur()
    }
  })

  // Combobox behavior contract:
  // - ArrowDown/ArrowUp on a closed menu open it and highlight first/last visible item.
  // - Enter selects the highlighted item, or the first visible item when the menu is open.
  // - Escape closes the open menu only; when already closed it falls back to clear-or-blur.

  return (
    <box width="100%" position="relative" zIndex={state.isOpen ? 100 : 0}>
      <box paddingX={2} paddingY={1} alignItems="center">
        <input
          ref={inputRef}
          width="100%"
          position="relative"
          focused={inputShouldBeFocused}
          flexGrow={1}
          value={value}
          placeholder={placeholder}
          placeholderColor={draculaColors.foreground}
          onInput={handleInputChange}
          onSubmit={submitCurrentValue}
        />
        {state.isLoading ? (
          <text position="absolute" right={0}>
            <span fg={homeScreenTheme.autocompleteLoading}>• </span>
          </text>
        ) : null}
      </box>

      {state.isOpen && visibleItems.length > 0 ? (
        <box
          position="absolute"
          top={3}
          left={0}
          right={0}
          zIndex={200}
          backgroundColor={homeScreenTheme.autocompleteMenuBackground}
          flexDirection="column"
        >
          {visibleItems.map((item) => {
            const description = getItemDescription?.(item)
            const itemKey = itemKeyGetter(item)
            const isHighlighted = itemKey === state.highlightedKey
            const bg = isHighlighted
              ? homeScreenTheme.autocompleteItemHighlightedBackground
              : homeScreenTheme.autocompleteMenuBackground
            const fg = isHighlighted
              ? homeScreenTheme.autocompleteItemHighlightedForeground
              : undefined

            return (
              <box
                key={itemKey}
                paddingX={2}
                paddingY={0}
                flexDirection="column"
                backgroundColor={bg}
              >
                <text>
                  <span bg={bg} fg={fg}>
                    {item.label}
                  </span>
                </text>
                {description ? (
                  <text>
                    <span bg={bg} fg={fg ?? homeScreenTheme.mutedText}>
                      {description}
                    </span>
                  </text>
                ) : null}
              </box>
            )
          })}
        </box>
      ) : null}
    </box>
  )
}
