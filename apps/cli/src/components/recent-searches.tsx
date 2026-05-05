import { homeScreenTheme } from "../theme/colors"

type RecentSearchesProps = {
  items: string[]
  focused?: boolean
}

export function RecentSearches({ items, focused = false }: RecentSearchesProps) {
  const backgroundColor = focused ? homeScreenTheme.panelFocusedBackground : undefined

  return (
    <box
      width="100%"
      height="100%"
      backgroundColor={backgroundColor}
      flexDirection="column"
      padding={1}
      gap={1}
      minHeight={0}
    >
      <text>
        <strong>Recent searches</strong>
      </text>

      <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focused}>
        <box width="100%" flexDirection="column">
          {items.map((item, index) => (
            <text key={`${item}-${index}`}>
              <span fg={focused ? homeScreenTheme.recentSearchFocusedForeground : undefined}>{item}</span>
            </text>
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
