import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import type { WiktionarySearchItem } from "@puhutko/shared"
import React from "react"
import { draculaColors, homeScreenTheme } from "../../../theme/colors"

type RecentSearchesProps = {
  items: WiktionarySearchItem[]
  selectedIndex: number | null
  onSelectedIndexChange: (index: number | null) => void
  onSelect: (item: WiktionarySearchItem) => void
  focused?: boolean
}

export function RecentSearches({
  items,
  selectedIndex,
  onSelectedIndexChange,
  onSelect,
  focused = false,
}: RecentSearchesProps) {
  const backgroundColor = focused ? homeScreenTheme.panelFocusedBackground : draculaColors.background
  const scrollboxRef = React.useRef<ScrollBoxRenderable | null>(null)

  React.useEffect(() => {
    if (selectedIndex === null || !items[selectedIndex]) {
      return
    }

    scrollboxRef.current?.scrollChildIntoView(`recent-item-${selectedIndex}`)
  }, [items, selectedIndex])

  useKeyboard((key) => {
    if (!focused || items.length === 0) {
      return
    }

    if (key.name !== "up" && key.name !== "down") {
      return
    }

    key.preventDefault()
    key.stopPropagation()

    const nextIndex =
      key.name === "up"
        ? selectedIndex === null || selectedIndex === 0
          ? items.length - 1
          : selectedIndex - 1
        : selectedIndex === null || selectedIndex === items.length - 1
          ? 0
          : selectedIndex + 1
    const nextItem = items[nextIndex]

    if (!nextItem) {
      return
    }

    onSelectedIndexChange(nextIndex)
    onSelect(nextItem)
  })

  return (
    <box
      width="100%"
      height="100%"
      backgroundColor={backgroundColor}
      flexDirection="column"
      padding={0}
      gap={0}
      minHeight={0}
    >
      <text marginX={2} marginY={1}>
        <strong>Recent searches</strong>
      </text>

      <scrollbox ref={scrollboxRef} width="100%" flexGrow={1} minHeight={0} focused={focused}>
        <box width="100%" flexDirection="column">
          {items.map((item, index) => (
            <box
              key={item.value}
              id={`recent-item-${index}`}
              width="100%"
              paddingX={2}
              backgroundColor={
                index === selectedIndex
                  ? homeScreenTheme.autocompleteItemHighlightedBackground
                  : backgroundColor
              }
            >
              <text>
                <span
                  bg={
                    index === selectedIndex
                      ? homeScreenTheme.autocompleteItemHighlightedBackground
                      : backgroundColor
                  }
                  fg={
                    index === selectedIndex
                      ? homeScreenTheme.autocompleteItemHighlightedForeground
                      : focused
                        ? homeScreenTheme.recentSearchFocusedForeground
                        : undefined
                  }
                >
                  {item.label || item.value}
                </span>
              </text>
            </box>
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
