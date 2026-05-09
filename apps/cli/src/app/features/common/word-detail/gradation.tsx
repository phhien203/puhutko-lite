import type { ConsonantGradation } from "@puhutko/shared"
import { homeScreenTheme } from "../../../theme/colors"

type SplitGrade = {
  value: string
  highlight: boolean
  highlightType?: "forward" | "reverse"
}

const gradationHighlightColor = homeScreenTheme.autocompleteLoading
const reverseGradationHighlightColor = homeScreenTheme.errorText
const defaultAsciiFontColor = homeScreenTheme.linkText

export function GradationHeader({
  word,
  gradation,
}: {
  word: string
  gradation?: ConsonantGradation
}) {
  return (
    <>
      <HighlightedGradationAsciiFont word={word} gradation={gradation} />
      <HighlightedGradationText word={word} gradation={gradation} />
    </>
  )
}

function HighlightedGradationAsciiFont({
  word,
  gradation,
}: {
  word: string
  gradation?: ConsonantGradation
}) {
  const normalizedWord = normalizeAsciiFontWord(word)

  if (!normalizedWord) {
    return null
  }

  const parts = splitStrongGrade(normalizedWord, gradation)

  if (parts.length === 1 && !parts[0]?.highlight) {
    return <ascii-font text={normalizedWord} font="block" color={defaultAsciiFontColor} />
  }

  return (
    <box flexDirection="row">
      {parts.map((part, index) =>
        part.value ? (
          <ascii-font
            key={`${index}:${part.value}`}
            text={part.value}
            font="block"
            color={part.highlight ? getHighlightColor(part.highlightType) : defaultAsciiFontColor}
          />
        ) : null,
      )}
    </box>
  )
}

function HighlightedGradationText({
  word,
  gradation,
}: {
  word: string
  gradation?: ConsonantGradation
}) {
  const parts = splitStrongGrade(word, gradation)
  const gradationInfo =
    gradation?.strong && gradation?.weak
      ? gradation.strongStart !== undefined
        ? ` (${gradation.strong} → ${gradation.weak})`
        : gradation.weakStart !== undefined
          ? ` (${gradation.strong} ← ${gradation.weak})`
          : ""
      : ""

  return (
    <box flexDirection="row" width="100%">
      {parts.map((part, index) => (
        <text key={`${index}:${part.value}`}>
          <span fg={part.highlight ? getHighlightColor(part.highlightType) : undefined}>
            {part.value}
          </span>
        </text>
      ))}
      {gradationInfo ? (
        <text>
          <span fg={homeScreenTheme.mutedText}>{gradationInfo}</span>
        </text>
      ) : null}
    </box>
  )
}

export function splitStrongGrade(word: string, gradation?: ConsonantGradation): SplitGrade[] {
  if (!gradation) {
    return [{ value: word, highlight: false }]
  }

  if (gradation.strongStart !== undefined) {
    return splitGradeByPosition(word, gradation, "strong")
  }

  if (gradation.weakStart !== undefined) {
    return splitGradeByPosition(word, gradation, "weak")
  }

  return [{ value: word, highlight: false }]
}

function splitGradeByPosition(
  value: string,
  gradation: ConsonantGradation,
  type: "strong" | "weak",
): SplitGrade[] {
  const search = type === "strong" ? gradation.strong : gradation.weak
  const opposite = type === "strong" ? gradation.weak : gradation.strong
  const start = type === "strong" ? gradation.strongStart : gradation.weakStart
  const highlightType = type === "strong" ? ("forward" as const) : ("reverse" as const)

  if (!search || start === undefined) {
    return [{ value, highlight: false }]
  }

  const end = start + search.length

  if (value.slice(start, end) !== search) {
    return splitGradeBySearch(value, gradation, type)
  }

  if (type === "weak" && opposite) {
    const strongAtSamePosition = value.slice(start, start + opposite.length)

    if (strongAtSamePosition === opposite) {
      return [{ value, highlight: false }]
    }
  }

  return [
    { value: value.slice(0, start), highlight: false },
    { value: value.slice(start, end), highlight: true, highlightType },
    { value: value.slice(end), highlight: false },
  ].filter((part) => part.value)
}

export function normalizeAsciiFontWord(word: string) {
  const normalizedWord = word.trim().normalize("NFC")

  if (!normalizedWord) {
    return null
  }

  return normalizedWord
    .replaceAll("ä", "a")
    .replaceAll("Ä", "A")
    .replaceAll("ö", "o")
    .replaceAll("Ö", "O")
}

function splitGradeBySearch(
  value: string,
  gradation: ConsonantGradation,
  type: "strong" | "weak",
): SplitGrade[] {
  const search = type === "strong" ? gradation.strong : gradation.weak
  const highlightType = type === "strong" ? ("forward" as const) : ("reverse" as const)

  if (!search) {
    return [{ value, highlight: false }]
  }

  if (type === "weak") {
    const index = value.lastIndexOf(search)

    if (index === -1) {
      return [{ value, highlight: false }]
    }

    return [
      { value: value.slice(0, index), highlight: false },
      { value: search, highlight: true, highlightType },
      { value: value.slice(index + search.length), highlight: false },
    ].filter((part) => part.value)
  }

  const parts: SplitGrade[] = []
  let offset = 0

  while (offset < value.length) {
    const index = value.indexOf(search, offset)

    if (index === -1) {
      parts.push({ value: value.slice(offset), highlight: false })
      break
    }

    if (index > offset) {
      parts.push({ value: value.slice(offset, index), highlight: false })
    }

    parts.push({ value: search, highlight: true, highlightType })
    offset = index + search.length
  }

  return parts
}

function getHighlightColor(type?: "forward" | "reverse") {
  return type === "reverse" ? reverseGradationHighlightColor : gradationHighlightColor
}
