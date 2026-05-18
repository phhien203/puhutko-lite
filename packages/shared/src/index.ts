export function appSignature(target: "server" | "cli") {
  return `puhutko-lite ${target} powered by shared`
}

export type PartOfSpeech =
  | "abbreviation"
  | "noun"
  | "proper noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "conjunction"
  | "pronoun"
  | "determiner"
  | "interjection"
  | "numeral"
  | "particle"
  | "phrase"
  | "proverb"
  | "prefix"
  | "suffix"
  | "interfix"
  | "postposition"
  | "preposition"
  | "contraction"
  | "punctuation"
  | "symbol"
  | "character"
  | "other"

export type RawPartOfSpeech = string

export type WiktionarySearchItem = {
  label: string
  value: string
  description?: string
  url?: string
}

export type MeaningGroup = {
  rawPartOfSpeech: RawPartOfSpeech
  partOfSpeech: PartOfSpeech
  meanings: string[]
}

export type FinnishNominalCase =
  | "nominative"
  | "genitive"
  | "partitive"
  | "essive"
  | "translative"
  | "inessive"
  | "elative"
  | "illative"
  | "adessive"
  | "ablative"
  | "allative"
  | "abessive"
  | "comitative"
  | "instructive"

export type FinnishGrammaticalNumber = "singular" | "plural"

export type FinnishVerbPerson = "1" | "2" | "3"

export type InflectionForm = {
  label: string
  value: string
  category?: "case" | "verb" | "other"
  case?: FinnishNominalCase
  number?: FinnishGrammaticalNumber
  person?: FinnishVerbPerson
  tense?: "present" | "past"
  mood?: "indicative" | "conditional" | "potential" | "imperative"
  tags?: string[]
}

export type ConsonantGradation = {
  pattern: string
  strong: string
  weak: string
  strongStart?: number
  weakStart?: number
}

export type PronunciationAudio = {
  fileName: string
  caption?: string
  qualifier?: string
  pageUrl: string
  source: "wiktionary-commons"
  originalUrl: string
  preferredPlaybackUrl: string
  mimeType: string
}

export type WordDetail = {
  id: string
  word: string
  normalizedWord: string
  rawPartOfSpeech: RawPartOfSpeech
  partOfSpeech: PartOfSpeech
  meaningGroups: MeaningGroup[]
  gradation?: ConsonantGradation
  pronunciations?: string[]
  pronunciationAudios?: PronunciationAudio[]
  inflections?: InflectionForm[]
  source: "kaikki"
}
