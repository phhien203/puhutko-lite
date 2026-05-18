import type {
  ConsonantGradation,
  FinnishGrammaticalNumber,
  FinnishNominalCase,
  FinnishVerbPerson,
  InflectionForm,
  MeaningGroup,
  PartOfSpeech,
  RawPartOfSpeech,
  WordDetail,
} from "@puhutko/shared"

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

const nominalCaseTags = new Map<string, FinnishNominalCase>([
  ["nominative", "nominative"],
  ["genitive", "genitive"],
  ["partitive", "partitive"],
  ["essive", "essive"],
  ["translative", "translative"],
  ["inessive", "inessive"],
  ["elative", "elative"],
  ["illative", "illative"],
  ["adessive", "adessive"],
  ["ablative", "ablative"],
  ["allative", "allative"],
  ["abessive", "abessive"],
  ["comitative", "comitative"],
  ["instructive", "instructive"],
])

const verbPersonTags = new Map<string, FinnishVerbPerson>([
  ["first-person", "1"],
  ["second-person", "2"],
  ["third-person", "3"],
])

type NormalizedConsonantGradation = ConsonantGradation & {
  sourcePattern: string
}

const supportedGradationPatterns = new Map<string, NormalizedConsonantGradation>([
  ["kk-k", { pattern: "kk-k", strong: "kk", weak: "k", sourcePattern: "kk-k" }],
  ["pp-p", { pattern: "pp-p", strong: "pp", weak: "p", sourcePattern: "pp-p" }],
  ["tt-t", { pattern: "tt-t", strong: "tt", weak: "t", sourcePattern: "tt-t" }],
  ["nk-ng", { pattern: "nk-ng", strong: "nk", weak: "ng", sourcePattern: "nk-ng" }],
  ["nt-nn", { pattern: "nt-nn", strong: "nt", weak: "nn", sourcePattern: "nt-nn" }],
  ["lt-ll", { pattern: "lt-ll", strong: "lt", weak: "ll", sourcePattern: "lt-ll" }],
  ["rt-rr", { pattern: "rt-rr", strong: "rt", weak: "rr", sourcePattern: "rt-rr" }],
  ["mp-mm", { pattern: "mp-mm", strong: "mp", weak: "mm", sourcePattern: "mp-mm" }],
  ["k-o", { pattern: "k-∅", strong: "k", weak: "ø", sourcePattern: "k-o" }],
  ["p-v", { pattern: "p-v", strong: "p", weak: "v", sourcePattern: "p-v" }],
  ["t-d", { pattern: "t-d", strong: "t", weak: "d", sourcePattern: "t-d" }],
  ["k-j", { pattern: "k-j", strong: "k", weak: "j", sourcePattern: "k-j" }],
  ["k-v", { pattern: "k-v", strong: "k", weak: "v", sourcePattern: "k-v" }],
  ["ik-j", { pattern: "k-j", strong: "k", weak: "j", sourcePattern: "ik-j" }],
])

const kaikkiPartOfSpeechMap: Record<string, PartOfSpeech> = {
  abbrev: "abbreviation",
  adjective: "adjective",
  adj: "adjective",
  adnominal: "adjective",
  adj_noun: "adjective",
  adj_verb: "adjective",
  adverb: "adverb",
  adv: "adverb",
  article: "determiner",
  character: "character",
  conjunction: "conjunction",
  conj: "conjunction",
  contraction: "contraction",
  determiner: "determiner",
  det: "determiner",
  interfix: "interfix",
  interjection: "interjection",
  intj: "interjection",
  name: "proper noun",
  noun: "noun",
  numeral: "numeral",
  num: "numeral",
  particle: "particle",
  phrase: "phrase",
  postposition: "postposition",
  postp: "postposition",
  prefix: "prefix",
  preposition: "preposition",
  prep: "preposition",
  pronoun: "pronoun",
  pron: "pronoun",
  proverb: "proverb",
  punctuation: "punctuation",
  punct: "punctuation",
  suffix: "suffix",
  symbol: "symbol",
  verb: "verb",
  "proper noun": "proper noun",
  "proper-noun": "proper noun",
  proper_noun: "proper noun",
  propn: "proper noun",
}

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
  return word.trim().normalize("NFC")
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
  const rawPartOfSpeech = getRawPartOfSpeech(primaryEntry?.pos)
  const partOfSpeech = mapPartOfSpeech(rawPartOfSpeech)
  const forms = entries.flatMap((entry) => entry.forms ?? [])
  const sounds = entries.flatMap((entry) => entry.sounds ?? [])
  const meaningGroups = mapMeaningGroups(entries)
  const gradation = parseConsonantGradation(word, forms)
  const pronunciations = unique(
    sounds.map((sound) => sound.ipa?.trim()).filter((ipa): ipa is string => Boolean(ipa)),
  ).slice(0, 2)
  const inflections = mapInflections(forms)

  return {
    id: `kaikki:${normalizedWord}:${primaryEntry?.pos ?? "other"}`,
    word,
    normalizedWord,
    rawPartOfSpeech,
    partOfSpeech,
    meaningGroups,
    gradation,
    pronunciations: pronunciations.length > 0 ? pronunciations : undefined,
    inflections: inflections.length > 0 ? inflections : undefined,
    source: "kaikki",
  }
}

function mapMeaningGroups(entries: KaikkiEntry[]): MeaningGroup[] {
  const groups = new Map<RawPartOfSpeech, MeaningGroup>()

  for (const entry of entries) {
    const rawPartOfSpeech = getRawPartOfSpeech(entry.pos)
    const partOfSpeech = mapPartOfSpeech(rawPartOfSpeech)
    const meanings = unique(entry.senses?.flatMap((sense) => sense.glosses ?? sense.raw_glosses ?? []).filter(Boolean) ?? [])

    if (meanings.length === 0) {
      continue
    }

    const existingGroup = groups.get(rawPartOfSpeech)

    if (existingGroup) {
      existingGroup.meanings = unique([...existingGroup.meanings, ...meanings]).slice(0, 8)
      continue
    }

    groups.set(rawPartOfSpeech, {
      rawPartOfSpeech,
      partOfSpeech,
      meanings: meanings.slice(0, 8),
    })
  }

  return [...groups.values()]
}

function mapInflections(forms: KaikkiEntry["forms"]): InflectionForm[] {
  const inflections = uniqueBy(
    forms
      ?.filter((form) => form.form && form.form !== "-" && form.tags?.some((tag) => !ignoredFormTags.has(tag)))
      .map((form) => mapInflectionForm(form.form ?? "", form.tags ?? [])) ?? [],
    (form) => `${form.category ?? "other"}:${form.label}:${form.value}`,
  )

  return inflections
}

function mapInflectionForm(value: string, tags: string[]): InflectionForm {
  const visibleTags = getVisibleTags(tags)
  const nominalCase = getNominalCase(visibleTags)
  const number = getGrammaticalNumber(visibleTags)
  const person = getVerbPerson(visibleTags)
  const mood = getVerbMood(visibleTags)
  const tense = getVerbTense(visibleTags)
  const baseForm: InflectionForm = {
    label: formatInflectionLabel(visibleTags),
    value,
    tags: visibleTags,
  }

  if (nominalCase) {
    return {
      ...baseForm,
      category: "case",
      case: nominalCase,
      number,
    }
  }

  if (person || mood || tense) {
    return {
      ...baseForm,
      category: "verb",
      number,
      person,
      mood,
      tense,
    }
  }

  return {
    ...baseForm,
    category: "other",
  }
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

    const gradation = normalizeConsonantGradation(className)

    if (gradation) {
      if (gradation.weak === "ø") {
        const strongStart = word.includes(gradation.strong)
          ? inferStrongGradeStart(word, gradation, forms)
          : undefined

        if (strongStart !== undefined) {
          return { ...gradation, strongStart }
        }

        const weakStart = inferWeakGradeStart(word, gradation, forms)

        if (weakStart !== undefined) {
          return { ...gradation, weakStart }
        }

        return { ...gradation }
      }

      const strongStart = word.includes(gradation.strong)
        ? inferStrongGradeStart(word, gradation, forms)
        : undefined
      const weakStart = word.includes(gradation.weak)
        ? inferWeakGradeStart(word, gradation, forms)
        : undefined

      if (strongStart !== undefined && weakStart !== undefined) {
        return strongStart >= weakStart
          ? { ...gradation, strongStart }
          : { ...gradation, weakStart }
      }

      if (strongStart !== undefined) {
        return { ...gradation, strongStart }
      }

      if (weakStart !== undefined) {
        return { ...gradation, weakStart }
      }

      return { ...gradation }
    }
  }

  return undefined
}

function normalizeConsonantGradation(className: string) {
  const pattern = className
    .replace(/\s+gradation$/, "")
    .replace(/[–—]/g, "-")
    .replace(/∅/g, "o")

  return supportedGradationPatterns.get(pattern)
}

function inferStrongGradeStart(word: string, gradation: NormalizedConsonantGradation, forms: KaikkiEntry["forms"]): number | undefined {
  const starts = getOccurrenceStarts(word, gradation.strong)

  if (starts.length === 0) {
    return undefined
  }

  const formTokens = getFormTokens(forms)

  for (const start of starts) {
    const prefix = word.slice(0, start)
    const strongPrefix = `${prefix}${gradation.strong}`
    const weakPrefix = getWeakPrefixForStrongInference(word, gradation, start)

    if (formTokens.some((token) => token.startsWith(weakPrefix) && !token.startsWith(strongPrefix))) {
      return start
    }
  }

  return undefined
}

function getWeakPrefixForStrongInference(word: string, gradation: NormalizedConsonantGradation, start: number) {
  if (gradation.weak === "ø") {
    if (start === 0) {
      return word.slice(gradation.strong.length)
    }

    return word.slice(0, start)
  }

  if (gradation.sourcePattern === "ik-j" && start > 0 && word.slice(start - 1, start + 1) === "ik") {
    return `${word.slice(0, start - 1)}${gradation.weak}`
  }

  return `${word.slice(0, start)}${gradation.weak}`
}

function inferWeakGradeStart(word: string, gradation: ConsonantGradation, forms: KaikkiEntry["forms"]): number | undefined {
  const finiteActiveFormTokens = getFormTokens(forms, { finiteActiveVerbOnly: true })
  const formTokens = finiteActiveFormTokens.length > 0 ? finiteActiveFormTokens : getFormTokens(forms)

  if (gradation.weak === "ø") {
    for (let start = word.length; start >= 0; start -= 1) {
      const weakPrefix = word.slice(0, start)
      const strongPrefix = `${weakPrefix}${gradation.strong}`

      if (
        formTokens.some((token) => token.startsWith(strongPrefix)) &&
        formTokens.some((token) => token.startsWith(weakPrefix) && !token.startsWith(strongPrefix))
      ) {
        return start
      }
    }

    return undefined
  }

  const starts = getOccurrenceStarts(word, gradation.weak)

  if (starts.length === 0) {
    return undefined
  }

  for (let index = starts.length - 1; index >= 0; index -= 1) {
    const start = starts[index]
    const prefix = word.slice(0, start)
    const strongAtSamePosition = `${prefix}${gradation.strong}`

    if (formTokens.some((token) => token.startsWith(strongAtSamePosition))) {
      return start
    }
  }

  return undefined
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

function getFormTokens(
  forms: KaikkiEntry["forms"],
  options?: { finiteActiveVerbOnly?: boolean },
) {
  return unique(
    forms
      ?.filter((form) => {
        if (!form.form || form.form === "-") {
          return false
        }

        if (!form.tags?.some((tag) => !ignoredFormTags.has(tag))) {
          return false
        }

        if (!options?.finiteActiveVerbOnly) {
          return true
        }

        return isFiniteActiveVerbForm(form.tags)
      })
      .flatMap((form) => form.form?.split(/\s+/) ?? [])
      .filter(Boolean) ?? [],
  )
}

function isFiniteActiveVerbForm(tags: string[]) {
  return getVerbMood(tags) !== undefined && !tags.includes("passive")
}

function getVisibleTags(tags: string[]) {
  return tags.filter((tag) => !ignoredFormTags.has(tag))
}

function formatInflectionLabel(visibleTags: string[]) {
  if (visibleTags.length === 0) {
    return "form"
  }

  return visibleTags.join(" ")
}

function getNominalCase(tags: string[]) {
  for (const tag of tags) {
    const nominalCase = nominalCaseTags.get(tag)

    if (nominalCase) {
      return nominalCase
    }
  }

  return undefined
}

function getGrammaticalNumber(tags: string[]): FinnishGrammaticalNumber | undefined {
  if (tags.includes("singular")) {
    return "singular"
  }

  if (tags.includes("plural")) {
    return "plural"
  }

  return undefined
}

function getVerbPerson(tags: string[]) {
  for (const tag of tags) {
    const person = verbPersonTags.get(tag)

    if (person) {
      return person
    }
  }

  return undefined
}

function getVerbMood(tags: string[]): InflectionForm["mood"] {
  if (tags.includes("indicative")) {
    return "indicative"
  }

  if (tags.includes("conditional")) {
    return "conditional"
  }

  if (tags.includes("potential")) {
    return "potential"
  }

  if (tags.includes("imperative")) {
    return "imperative"
  }

  return undefined
}

function getVerbTense(tags: string[]): InflectionForm["tense"] {
  if (tags.includes("present")) {
    return "present"
  }

  if (tags.includes("past")) {
    return "past"
  }

  return undefined
}

function getRawPartOfSpeech(pos: string | undefined): RawPartOfSpeech {
  return pos?.trim() || "other"
}

function mapPartOfSpeech(pos: string | undefined): PartOfSpeech {
  return pos ? kaikkiPartOfSpeechMap[pos] ?? "other" : "other"
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
