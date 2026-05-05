export function appSignature(target: "server" | "cli") {
  return `puhutko-lite ${target} powered by shared`
}

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "numeral"
  | "particle"
  | "postposition"
  | "preposition"
  | "other"

export type WiktionarySearchItem = {
  label: string
  value: string
  description?: string
  url?: string
}

export type MeaningGroup = {
  partOfSpeech: PartOfSpeech
  meanings: string[]
}

export type InflectionForm = {
  label: string
  value: string
}

export type ConsonantGradation = {
  pattern: string
  strong: string
  weak: string
  strongStart?: number
  weakStart?: number
}

export type WordDetail = {
  id: string
  word: string
  normalizedWord: string
  partOfSpeech: PartOfSpeech
  meaningGroups: MeaningGroup[]
  gradation?: ConsonantGradation
  pronunciations?: string[]
  pronunciationUrl?: string
  inflections?: InflectionForm[]
  source: "kaikki"
}
