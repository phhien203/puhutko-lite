type DetailsViewItem = {
  label: string
  value: string
  description?: string
  url?: string
}

type DetailsViewProps = {
  item: DetailsViewItem | null
  focused?: boolean
}

export function DetailsView({ item, focused = false }: DetailsViewProps) {
  const borderColor = focused ? "green" : "gray"
  const backgroundColor = focused ? "#112211" : undefined

  return (
    <box
      width="100%"
      height="100%"
      border
      borderStyle="rounded"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      flexDirection="column"
      padding={1}
      gap={1}
      minHeight={0}
    >
      <text>
        <strong>Details</strong>
      </text>

      {item ? (
        <>
          <text>
            <strong>{item.label}</strong>
          </text>
          <text>{item.value}</text>

          {item.description ? (
            <text>
              <span fg="gray">{item.description}</span>
            </text>
          ) : null}

          {item.url ? (
            <text>
              <span fg="cyan">{item.url}</span>
            </text>
          ) : null}
        </>
      ) : (
        <text>
          <span fg="gray">Select a Wiktionary result to inspect it here.</span>
        </text>
      )}
    </box>
  )
}
