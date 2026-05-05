import { getFinnishWordDetail } from "@puhutko/kaikki"
import type { WiktionarySearchItem, WordDetail } from "@puhutko/shared"
import React from "react"
import { draculaColors, homeScreenTheme } from "../theme/colors"
import { WordDetailView } from "./word-detail"

type DetailsViewProps = {
  item: WiktionarySearchItem | null
  focused?: boolean
}

type DetailStatus = "idle" | "loading" | "loaded" | "not-found" | "error"

export function DetailsView({ item, focused = false }: DetailsViewProps) {
  const [detail, setDetail] = React.useState<WordDetail | null>(null)
  const [status, setStatus] = React.useState<DetailStatus>("idle")

  React.useEffect(() => {
    if (!item) {
      setDetail(null)
      setStatus("idle")
      return
    }

    const controller = new AbortController()

    setDetail(null)
    setStatus("loading")

    void (async () => {
      try {
        const nextDetail = await getFinnishWordDetail(item.value, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        if (!nextDetail) {
          setStatus("not-found")
          return
        }

        setDetail(nextDetail)
        setStatus("loaded")
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setStatus("error")
      }
    })()

    return () => {
      controller.abort()
    }
  }, [item?.value])

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={0}
      minHeight={0}
      backgroundColor={focused ? draculaColors.currentLine : draculaColors.background}
    >
      <scrollbox width="100%" flexGrow={1} minHeight={0} focused={focused}>
        <box width="100%" flexDirection="column" gap={1} padding={0}>
          {item ? (
            status === "loading" ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.mutedText}>Loading Kaikki details...</span>
                </text>
              </>
            ) : status === "not-found" ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.mutedText}>No Kaikki detail found for this word.</span>
                </text>
              </>
            ) : status === "error" ? (
              <>
                <text>
                  <strong>{item.label}</strong>
                </text>
                <text>
                  <span fg={homeScreenTheme.errorText}>Failed to load Kaikki details.</span>
                </text>
              </>
            ) : detail ? (
              <WordDetailView detail={detail} focused={focused} />
            ) : null
          ) : (
            <text>
              <span fg={homeScreenTheme.mutedText}>Select a Wiktionary result to inspect it here.</span>
            </text>
          )}
        </box>
      </scrollbox>
    </box>
  )
}
