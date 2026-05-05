import type { WiktionarySearchItem } from "@puhutko/shared"
import { homeScreenTheme } from "../theme/colors"

type DetailsViewProps = {
  item: WiktionarySearchItem | null
  focused?: boolean
}

export function DetailsView({ item, focused = false }: DetailsViewProps) {
  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      minHeight={0}
    >
      <box width="100%" height="100%" flexDirection="column" gap={1} minHeight={0}>
        <box padding={1}>
          <text>
            <strong>Details</strong>
          </text>
        </box>

        <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focused}>
          <box width="100%" flexDirection="column" gap={1} padding={1}>
            {item ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  {item.value}
                </text>

                {item.description ? (
                  <text>
                    <span fg={homeScreenTheme.mutedText}>{item.description}</span>
                  </text>
                ) : null}

                {item.url ? (
                  <text>
                    <span fg={homeScreenTheme.linkText}>{item.url}</span>
                  </text>
                ) : null}
              </>
            ) : (
              <text>
                <span fg={homeScreenTheme.mutedText}>Select a Wiktionary result to inspect it here.</span>
              </text>
            )}
          </box>
        </scrollbox>
      </box>
    </box>
  )
}
