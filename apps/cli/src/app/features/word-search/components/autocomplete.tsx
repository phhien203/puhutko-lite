import { RenderableEvents, type InputRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import React from "react"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"
import { useDebounce } from "../../../hooks/use-debounce"

type AutocompleteProps<T> = {
  value: string
  onChange: (value: string) => void
  onSelect: (item: T) => void
  focused?: boolean
  loaderFn: (query: string, signal: AbortSignal) => Promise<T[]>
  createItemFromValue?: (value: string) => T
  getItemDescription?: (item: T) => string | undefined
  onError?: (error: unknown) => void
  onActiveChange?: (active: boolean) => void
  placeholder?: string
  debounceMs?: number
  minQueryLength?: number
  maxVisibleItems?: number
}

export function Autocomplete<T extends { label: string; value: string }>({
  value,
  onChange,
  onSelect,
  focused,
  loaderFn,
  createItemFromValue,
  getItemDescription,
  onError,
  onActiveChange,
  placeholder,
  debounceMs = 300,
  minQueryLength = 2,
  maxVisibleItems = 5,
}: AutocompleteProps<T>) {
  const [items, setItems] = React.useState<T[]>([])
  const [isFocused, setIsFocused] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null)
  const [shouldFocusInput, setShouldFocusInput] = React.useState(true)
  const [wasDismissedByEscape, setWasDismissedByEscape] = React.useState(false)
  const latestRequestIdRef = React.useRef(0)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const inputRef = React.useRef<InputRenderable | null>(null)
  const itemsRef = React.useRef<T[]>([])
  const isFocusedRef = React.useRef(false)
  const pendingProgrammaticValueRef = React.useRef<string | null>(null)
  const wasDismissedByEscapeRef = React.useRef(false)
  const debouncedValue = useDebounce(value, debounceMs)
  const visibleItems = items.slice(0, maxVisibleItems)
  const active = isFocused || isOpen || isLoading

  const handleInputChange = React.useCallback(
    (nextValue: string) => {
      if (pendingProgrammaticValueRef.current === nextValue) {
        pendingProgrammaticValueRef.current = null
        return
      }

      setWasDismissedByEscape(false)
      onChange(nextValue)
    },
    [onChange],
  )

  const selectItem = React.useCallback(
    (item: T) => {
      const nextValue = item.value

      pendingProgrammaticValueRef.current = nextValue
      setWasDismissedByEscape(true)
      onChange(nextValue)
      onSelect(item)
      setIsOpen(false)
      setHighlightedIndex(null)
    },
    [onChange, onSelect],
  )

  const submitCurrentValue = React.useCallback(() => {
    if (highlightedIndex !== null) {
      const item = visibleItems[highlightedIndex]

      if (item) {
        selectItem(item)
      }

      return
    }

    const customItem = createItemFromValue
      ? createItemFromValue(value)
      : ({ label: value, value, name: value } as unknown as T)

    setWasDismissedByEscape(true)
    setIsOpen(false)
    setHighlightedIndex(null)
    onSelect(customItem)
  }, [createItemFromValue, highlightedIndex, onSelect, selectItem, value, visibleItems])

  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  React.useEffect(() => {
    isFocusedRef.current = isFocused
  }, [isFocused])

  React.useEffect(() => {
    if (focused !== undefined) {
      setShouldFocusInput(focused)
    }
  }, [focused])

  React.useEffect(() => {
    if (shouldFocusInput) {
      inputRef.current?.focus()
    }
  }, [shouldFocusInput])

  React.useEffect(() => {
    wasDismissedByEscapeRef.current = wasDismissedByEscape
  }, [wasDismissedByEscape])

  React.useEffect(() => {
    if (pendingProgrammaticValueRef.current === value) {
      pendingProgrammaticValueRef.current = null
    }
  }, [value])

  React.useEffect(() => {
    onActiveChange?.(active)
  }, [active, onActiveChange])

  React.useEffect(() => {
    const query = value.trim()

    if (query.length < minQueryLength) {
      setItems([])
      setIsOpen(false)
      setIsLoading(false)
      setHighlightedIndex(null)
      return
    }

      if (query !== debouncedValue.trim()) {
        setIsOpen(false)
        setHighlightedIndex(null)
      }
  }, [debouncedValue, minQueryLength, value])

  React.useEffect(() => {
    const input = inputRef.current

    if (!input) {
      return
    }

    const handleFocused = () => {
      if (focused === undefined) {
        setShouldFocusInput(true)
      }

      setIsFocused(true)

      if (itemsRef.current.length > 0 && !wasDismissedByEscapeRef.current) {
        setIsOpen(true)
      }
    }

    const handleBlurred = () => {
      if (focused === undefined) {
        setShouldFocusInput(false)
      }

      setIsFocused(false)
      setIsOpen(false)
      setHighlightedIndex(null)
    }

    setIsFocused(input.focused)
    input.on(RenderableEvents.FOCUSED, handleFocused)
    input.on(RenderableEvents.BLURRED, handleBlurred)

    return () => {
      input.off(RenderableEvents.FOCUSED, handleFocused)
      input.off(RenderableEvents.BLURRED, handleBlurred)
    }
  }, [focused])

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  React.useEffect(() => {
    const query = debouncedValue.trim()

    if (query.length < minQueryLength) {
      latestRequestIdRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      setItems([])
      setIsOpen(false)
      setIsLoading(false)
      setHighlightedIndex(null)
      setWasDismissedByEscape(false)
      return
    }

    abortControllerRef.current?.abort()

    const controller = new AbortController()
    const requestId = latestRequestIdRef.current + 1

    abortControllerRef.current = controller
    latestRequestIdRef.current = requestId
    setIsLoading(true)

    void loaderFn(query, controller.signal)
      .then((nextItems) => {
        if (controller.signal.aborted || requestId !== latestRequestIdRef.current) {
          return
        }

        setItems(nextItems)
        setIsLoading(false)
        setHighlightedIndex(null)
        setIsOpen(
          isFocusedRef.current && nextItems.length > 0 && !wasDismissedByEscapeRef.current,
        )
      })
      .catch((error) => {
        if (controller.signal.aborted || requestId !== latestRequestIdRef.current) {
          return
        }

        setItems([])
        setIsOpen(false)
        setIsLoading(false)
        setHighlightedIndex(null)
        onError?.(error)
      })

    return () => {
      controller.abort()
    }
  }, [debouncedValue, loaderFn, minQueryLength, onError])

  useKeyboard((key) => {
    if (!isFocusedRef.current) {
      return
    }

    const shouldAllowGlobalShortcutBubbling =
      key.ctrl && !key.meta && !key.option && ["b", "c", "g", "x"].includes(key.name)

    if (shouldAllowGlobalShortcutBubbling) {
      return
    }

    if (key.name === "up" && isOpen && visibleItems.length > 0) {
      setHighlightedIndex((currentIndex) =>
        currentIndex === null || currentIndex === 0
          ? visibleItems.length - 1
          : currentIndex - 1,
      )
      return
    }

    if (key.name === "down" && isOpen && visibleItems.length > 0) {
      setHighlightedIndex((currentIndex) =>
        currentIndex === null || currentIndex === visibleItems.length - 1
          ? 0
          : currentIndex + 1,
      )
      return
    }

    if (key.name === "escape") {
      if (isOpen) {
        setIsOpen(false)
        setWasDismissedByEscape(true)
        return
      }

      if (value.length > 0) {
        handleInputChange("")
        return
      }

      setWasDismissedByEscape(true)
      setShouldFocusInput(false)
      inputRef.current?.blur()
    }
  })

  return (
    <box width="100%" position="relative" zIndex={isOpen ? 100 : 0}>
      <box paddingX={2} paddingY={1} alignItems="center">
        <input
          ref={inputRef}
          width="100%"
          position="relative"
          focused={shouldFocusInput}
          flexGrow={1}
          value={value}
          placeholder={placeholder}
          placeholderColor={draculaColors.foreground}
          onInput={handleInputChange}
          onSubmit={submitCurrentValue}
        />
        {isLoading ? (
          <text position="absolute" right={0}>
            <span fg={homeScreenTheme.autocompleteLoading}>• </span>
          </text>
        ) : null}
      </box>

      {isOpen && visibleItems.length > 0 ? (
        <box
          position="absolute"
          top={3}
          left={0}
          right={0}
          zIndex={200}
          backgroundColor={homeScreenTheme.autocompleteMenuBackground}
          flexDirection="column"
        >
          {visibleItems.map((item, index) => {
            const description = getItemDescription?.(item)
            const isHighlighted = index === highlightedIndex
            const bg = isHighlighted
              ? homeScreenTheme.autocompleteItemHighlightedBackground
              : homeScreenTheme.autocompleteMenuBackground
            const fg = isHighlighted
              ? homeScreenTheme.autocompleteItemHighlightedForeground
              : undefined

            return (
              <box
                key={`${item.value}:${item.label}`}
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
