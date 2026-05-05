import { getFinnishWordDetail } from "@puhutko/kaikki"
import type { WiktionarySearchItem, WordDetail } from "@puhutko/shared"
import React from "react"
import { homeScreenTheme } from "../theme/colors"

type DetailsViewProps = {
  item: WiktionarySearchItem | null
  focused?: boolean
}

type DetailStatus = "idle" | "loading" | "loaded" | "not-found" | "error"

function renderDetail(detail: WordDetail) {
  return (
    <>
      <text>
        <strong>{detail.word}</strong>
      </text>

      <text>
        <span fg={homeScreenTheme.mutedText}>{detail.partOfSpeech}</span>
      </text>

      {detail.pronunciations && detail.pronunciations.length > 0 ? (
        <text>Pronunciation: {detail.pronunciations.join(", ")}</text>
      ) : null}

      {detail.pronunciationUrl ? (
        <text>
          <span fg={homeScreenTheme.linkText}>{detail.pronunciationUrl}</span>
        </text>
      ) : null}

      {detail.meaningGroups.map((group) => (
        <box key={`${detail.id}:${group.partOfSpeech}`} flexDirection="column">
          <text>
            <strong>{group.partOfSpeech}</strong>
          </text>

          {group.meanings.map((meaning, index) => (
            <text key={`${detail.id}:${group.partOfSpeech}:${index}`}>{index + 1}. {meaning}</text>
          ))}
        </box>
      ))}

      {detail.inflections && detail.inflections.length > 0 ? (
        <box flexDirection="column">
          <text>
            <strong>Inflections</strong>
          </text>

          {detail.inflections.map((inflection, index) => (
            <text key={`${detail.id}:inflection:${index}`}>
              {inflection.label}: {inflection.value}
            </text>
          ))}
        </box>
      ) : null}
    </>
  )
}

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
                renderDetail(detail)
              ) : null
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
