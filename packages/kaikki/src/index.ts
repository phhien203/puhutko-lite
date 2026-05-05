import type { ConsonantGradation, InflectionForm, MeaningGroup, PartOfSpeech, WordDetail } from "@puhutko/shared"

type KaikkiEntry = {
  word?: string
  pos?: string
  senses?: Array<{
    glosses?: string[]
    raw_glosses?: string[]
  }>
  forms?: Array<{
    form?: string
    tags?: string[]
  }>
  sounds?: Array<{
    ipa?: string
    audio?: string
    ogg_url?: string
    mp3_url?: string
  }>
}

const ignoredFormTags = new Set(["table-tags", "inflection-template", "class", "rare"])

const supportedGradationPatterns = new Map<string, ConsonantGradation>([
  ["kk-k", { pattern: "kk-k", strong: "kk", weak: "k" }],
  ["pp-p", { pattern: "pp-p", strong: "pp", weak: "p" }],
  ["tt-t", { pattern: "tt-t", strong: "tt", weak: "t" }],
  ["nk-ng", { pattern: "nk-ng", strong: "nk", weak: "ng" }],
  ["nt-nn", { pattern: "nt-nn", strong: "nt", weak: "nn" }],
  ["lt-ll", { pattern: "lt-ll", strong: "lt", weak: "ll" }],
  ["rt-rr", { pattern: "rt-rr", strong: "rt", weak: "rr" }],
  ["mp-mm", { pattern: "mp-mm", strong: "mp", weak: "mm" }],
  ["k-o", { pattern: "k-∅", strong: "k", weak: "ø" }],
  ["p-v", { pattern: "p-v", strong: "p", weak: "v" }],
  ["t-d", { pattern: "t-d", strong: "t", weak: "d" }],
])

export async function getFinnishWordDetail(word: string, signal?: AbortSignal): Promise<WordDetail | null> {
  const normalizedWord = normalizeWord(word)

  if (!normalizedWord) {
    return null
  }

  try {
    const response = await fetch(buildWordJsonlUrl(normalizedWord), { signal })

    if (!response.ok) {
      return null
    }

    const entries = parseKaikkiJsonLines(await response.text()).filter(
      (entry) => normalizeWord(entry.word ?? "") === normalizedWord,
    )

    if (entries.length === 0) {
      return null
    }

    return mapKaikkiEntries(entries)
  } catch {
    return null
  }
}

function normalizeWord(word: string) {
  return word.trim()
}

function buildWordJsonlUrl(word: string) {
  const letters = [...word]
  const firstLetter = letters[0]
  const firstTwoLetters = letters.slice(0, 2).join("")
  const encodedWord = encodeURIComponent(word)

  return `https://kaikki.org/dictionary/Finnish/meaning/${encodeURIComponent(firstLetter)}/${encodeURIComponent(firstTwoLetters)}/${encodedWord}.jsonl`
}

function parseKaikkiJsonLines(text: string): KaikkiEntry[] {
  const entries: KaikkiEntry[] = []

  for (const line of text.split("\n")) {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      continue
    }

    try {
      const entry = JSON.parse(trimmedLine) as KaikkiEntry

      if (entry.word) {
        entries.push(entry)
      }
    } catch {
      return []
    }
  }

  return entries
}

function mapKaikkiEntries(entries: KaikkiEntry[]): WordDetail {
  const primaryEntry = entries[0]
  const word = primaryEntry?.word ?? ""
  const normalizedWord = normalizeWord(word)
  const partOfSpeech = mapPartOfSpeech(primaryEntry?.pos)
  const forms = entries.flatMap((entry) => entry.forms ?? [])
  const sounds = entries.flatMap((entry) => entry.sounds ?? [])
  const meaningGroups = mapMeaningGroups(entries)
  const gradation = parseConsonantGradation(word, forms)
  const pronunciations = unique(
    sounds.map((sound) => sound.ipa?.trim()).filter((ipa): ipa is string => Boolean(ipa)),
  ).slice(0, 2)
  const inflections = mapInflections(forms)
  const pronunciationUrl = sounds.find((sound) => sound.ogg_url || sound.mp3_url || sound.audio)?.ogg_url
    ?? sounds.find((sound) => sound.ogg_url || sound.mp3_url || sound.audio)?.mp3_url
    ?? sounds.find((sound) => sound.ogg_url || sound.mp3_url || sound.audio)?.audio

  return {
    id: `kaikki:${normalizedWord}:${primaryEntry?.pos ?? "other"}`,
    word,
    normalizedWord,
    partOfSpeech,
    meaningGroups,
    gradation,
    pronunciations: pronunciations.length > 0 ? pronunciations : undefined,
    pronunciationUrl,
    inflections: inflections.length > 0 ? inflections : undefined,
    source: "kaikki",
  }
}

function mapMeaningGroups(entries: KaikkiEntry[]): MeaningGroup[] {
  const groups = new Map<PartOfSpeech, string[]>()

  for (const entry of entries) {
    const partOfSpeech = mapPartOfSpeech(entry.pos)
    const meanings = unique(entry.senses?.flatMap((sense) => sense.glosses ?? sense.raw_glosses ?? []).filter(Boolean) ?? [])

    if (meanings.length === 0) {
      continue
    }

    groups.set(partOfSpeech, unique([...(groups.get(partOfSpeech) ?? []), ...meanings]).slice(0, 8))
  }

  return [...groups.entries()].map(([partOfSpeech, meanings]) => ({
    partOfSpeech,
    meanings,
  }))
}

function mapInflections(forms: KaikkiEntry["forms"]): InflectionForm[] {
  const inflections = uniqueBy(
    forms
      ?.filter((form) => form.form && form.form !== "-" && form.tags?.some((tag) => !ignoredFormTags.has(tag)))
      .map((form) => ({
        label: formatInflectionLabel(form.tags ?? []),
        value: form.form ?? "",
      })) ?? [],
    (form) => `${form.label}:${form.value}`,
  )

  return inflections.slice(0, 24)
}

function parseConsonantGradation(word: string, forms: KaikkiEntry["forms"]): ConsonantGradation | undefined {
  for (const form of forms ?? []) {
    if (!form.form || !form.tags?.includes("class")) {
      continue
    }

    const className = form.form.trim()

    if (className === "no gradation" || !className.includes("gradation")) {
      continue
    }

    const pattern = className
      .replace(/\s+gradation$/, "")
      .replace(/[–—]/g, "-")
      .replace(/∅/g, "o")

    const gradation = supportedGradationPatterns.get(pattern)

    if (gradation) {
      if (word.includes(gradation.strong)) {
        const strongStart = inferStrongGradeStart(word, gradation, forms)

        if (strongStart !== undefined) {
          return { ...gradation, strongStart }
        }
      }

      if (word.includes(gradation.weak)) {
        const weakStart = inferWeakGradeStart(word, gradation, forms)

        if (weakStart !== undefined) {
          return { ...gradation, weakStart }
        }
      }

      return { ...gradation }
    }
  }

  return undefined
}

function inferStrongGradeStart(word: string, gradation: ConsonantGradation, forms: KaikkiEntry["forms"]): number | undefined {
  const starts = getOccurrenceStarts(word, gradation.strong)

  if (starts.length === 0) {
    return undefined
  }

  const formTokens = getFormTokens(forms)

  for (const start of starts) {
    const prefix = word.slice(0, start)
    const weakPrefix = gradation.weak === "ø" ? prefix : `${prefix}${gradation.weak}`
    const strongPrefix = `${prefix}${gradation.strong}`

    if (formTokens.some((token) => token.startsWith(weakPrefix) && !token.startsWith(strongPrefix))) {
      return start
    }
  }

  return starts.length === 1 ? starts[0] : undefined
}

function inferWeakGradeStart(word: string, gradation: ConsonantGradation, forms: KaikkiEntry["forms"]): number | undefined {
  const starts = getOccurrenceStarts(word, gradation.weak)

  if (starts.length === 0) {
    return undefined
  }

  const formTokens = getFormTokens(forms)

  for (let index = starts.length - 1; index >= 0; index -= 1) {
    const start = starts[index]
    const prefix = word.slice(0, start)
    const strongAtSamePosition = `${prefix}${gradation.strong}`

    if (formTokens.some((token) => token.startsWith(strongAtSamePosition))) {
      return start
    }
  }

  return starts[starts.length - 1]
}

function getOccurrenceStarts(value: string, search: string) {
  const starts: number[] = []
  let offset = 0

  while (offset < value.length) {
    const index = value.indexOf(search, offset)

    if (index === -1) {
      break
    }

    starts.push(index)
    offset = index + 1
  }

  return starts
}

function getFormTokens(forms: KaikkiEntry["forms"]) {
  return unique(
    forms
      ?.filter((form) => form.form && form.form !== "-" && form.tags?.some((tag) => !ignoredFormTags.has(tag)))
      .flatMap((form) => form.form?.split(/\s+/) ?? [])
      .filter(Boolean) ?? [],
  )
}

function formatInflectionLabel(tags: string[]) {
  const visibleTags = tags.filter((tag) => !ignoredFormTags.has(tag))

  if (visibleTags.length === 0) {
    return "form"
  }

  return visibleTags.join(" ")
}

function mapPartOfSpeech(pos: string | undefined): PartOfSpeech {
  switch (pos) {
    case "noun":
    case "verb":
    case "adjective":
    case "adverb":
    case "pronoun":
    case "numeral":
    case "particle":
      return pos
    case "postposition":
    case "postp":
      return "postposition"
    case "preposition":
    case "prep":
      return "preposition"
    case "adj":
      return "adjective"
    case "adv":
      return "adverb"
    case "num":
      return "numeral"
    default:
      return "other"
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string) {
  const seen = new Set<string>()
  const uniqueValues: T[] = []

  for (const value of values) {
    const key = getKey(value)

    if (!seen.has(key)) {
      seen.add(key)
      uniqueValues.push(value)
    }
  }

  return uniqueValues
}
