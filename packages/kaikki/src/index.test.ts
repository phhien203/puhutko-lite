import type { PartOfSpeech } from "@puhutko/shared"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { getFinnishWordDetail } from "./index"

type KaikkiFormFixture = {
  form: string
  tags: string[]
}

type KaikkiEntryFixture = {
  word: string
  pos: string
  forms: KaikkiFormFixture[]
  senses?: Array<{
    glosses?: string[]
    raw_glosses?: string[]
  }>
}

type PartOfSpeechCase = {
  word: string
  rawPartOfSpeech: string
  expectedPartOfSpeech: PartOfSpeech
}

const fixtures = new Map<string, KaikkiEntryFixture[]>([
  [
    "koe",
    [
      {
        word: "koe",
        pos: "noun",
        forms: [
          { form: "k–∅ gradation", tags: ["class"] },
          { form: "koe", tags: ["nominative", "singular"] },
          { form: "kokeet", tags: ["nominative", "plural"] },
          { form: "kokeen", tags: ["genitive", "singular"] },
        ],
      },
    ],
  ],
  [
    "säe",
    [
      {
        word: "säe",
        pos: "noun",
        forms: [
          { form: "k–∅ gradation", tags: ["class"] },
          { form: "säe", tags: ["nominative", "singular"] },
          { form: "säkeet", tags: ["nominative", "plural"] },
          { form: "säkeen", tags: ["genitive", "singular"] },
        ],
      },
    ],
  ],
  [
    "pelätä",
    [
      {
        word: "pelätä",
        pos: "verb",
        forms: [
          { form: "k–∅ gradation", tags: ["class"] },
          {
            form: "pelkää",
            tags: ["indicative", "present", "singular", "third-person"],
          },
          {
            form: "pelännen",
            tags: ["first-person", "potential", "present", "singular"],
          },
        ],
      },
    ],
  ],
  [
    "lukea",
    [
      {
        word: "lukea",
        pos: "verb",
        forms: [
          { form: "k–∅ gradation", tags: ["class"] },
          {
            form: "luen",
            tags: ["first-person", "indicative", "present", "singular"],
          },
          {
            form: "lukee",
            tags: ["indicative", "present", "singular", "third-person"],
          },
        ],
      },
    ],
  ],
  [
    "jalka",
    [
      {
        word: "jalka",
        pos: "noun",
        forms: [
          { form: "k–∅ gradation", tags: ["class"] },
          { form: "jalan", tags: ["genitive", "singular"] },
          { form: "jalka", tags: ["nominative", "singular"] },
        ],
      },
    ],
  ],
  [
    "matto",
    [
      {
        word: "matto",
        pos: "noun",
        forms: [
          { form: "tt-t gradation", tags: ["class"] },
          { form: "matto", tags: ["nominative", "singular"] },
          { form: "maton", tags: ["genitive", "singular"] },
        ],
      },
    ],
  ],
])

const finnishPartOfSpeechCases: PartOfSpeechCase[] = [
  { word: "pos-abbrev", rawPartOfSpeech: "abbrev", expectedPartOfSpeech: "abbreviation" },
  { word: "pos-adj", rawPartOfSpeech: "adj", expectedPartOfSpeech: "adjective" },
  { word: "pos-adv", rawPartOfSpeech: "adv", expectedPartOfSpeech: "adverb" },
  { word: "pos-character", rawPartOfSpeech: "character", expectedPartOfSpeech: "character" },
  { word: "pos-conj", rawPartOfSpeech: "conj", expectedPartOfSpeech: "conjunction" },
  { word: "pos-contraction", rawPartOfSpeech: "contraction", expectedPartOfSpeech: "contraction" },
  { word: "pos-det", rawPartOfSpeech: "det", expectedPartOfSpeech: "determiner" },
  { word: "pos-interfix", rawPartOfSpeech: "interfix", expectedPartOfSpeech: "interfix" },
  { word: "pos-intj", rawPartOfSpeech: "intj", expectedPartOfSpeech: "interjection" },
  { word: "pos-name", rawPartOfSpeech: "name", expectedPartOfSpeech: "proper noun" },
  { word: "pos-noun", rawPartOfSpeech: "noun", expectedPartOfSpeech: "noun" },
  { word: "pos-num", rawPartOfSpeech: "num", expectedPartOfSpeech: "numeral" },
  { word: "pos-particle", rawPartOfSpeech: "particle", expectedPartOfSpeech: "particle" },
  { word: "pos-phrase", rawPartOfSpeech: "phrase", expectedPartOfSpeech: "phrase" },
  { word: "pos-postp", rawPartOfSpeech: "postp", expectedPartOfSpeech: "postposition" },
  { word: "pos-prefix", rawPartOfSpeech: "prefix", expectedPartOfSpeech: "prefix" },
  { word: "pos-prep", rawPartOfSpeech: "prep", expectedPartOfSpeech: "preposition" },
  { word: "pos-pron", rawPartOfSpeech: "pron", expectedPartOfSpeech: "pronoun" },
  { word: "pos-proverb", rawPartOfSpeech: "proverb", expectedPartOfSpeech: "proverb" },
  { word: "pos-punct", rawPartOfSpeech: "punct", expectedPartOfSpeech: "punctuation" },
  { word: "pos-suffix", rawPartOfSpeech: "suffix", expectedPartOfSpeech: "suffix" },
  { word: "pos-symbol", rawPartOfSpeech: "symbol", expectedPartOfSpeech: "symbol" },
  { word: "pos-verb", rawPartOfSpeech: "verb", expectedPartOfSpeech: "verb" },
]

for (const partOfSpeechCase of finnishPartOfSpeechCases) {
  fixtures.set(partOfSpeechCase.word, [
    {
      word: partOfSpeechCase.word,
      pos: partOfSpeechCase.rawPartOfSpeech,
      forms: [],
      senses: [{ glosses: [partOfSpeechCase.word] }],
    },
  ])
}

fixtures.set("joka-test", [
  {
    word: "joka-test",
    pos: "pron",
    forms: [{ form: "joka-test", tags: ["nominative", "singular"] }],
    senses: [{ glosses: ["relative pronoun"] }],
  },
  {
    word: "joka-test",
    pos: "det",
    forms: [],
    senses: [{ glosses: ["determiner"] }],
  },
])

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const pathname = new URL(url).pathname
    const fileName = pathname.split("/").at(-1)
    const word = decodeURIComponent(fileName?.replace(/\.jsonl$/, "") ?? "")
    const entries = fixtures.get(word)

    if (!entries) {
      return new Response("", { status: 404 })
    }

    return new Response(entries.map((entry) => JSON.stringify(entry)).join("\n"), {
      status: 200,
      headers: { "content-type": "application/jsonl" },
    })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("getFinnishWordDetail gradation inference", () => {
  test("infers hidden weak grade for koe", async () => {
    const detail = await getFinnishWordDetail("koe")

    expect(detail?.gradation).toMatchObject({
      pattern: "k-∅",
      strong: "k",
      weak: "ø",
      weakStart: 2,
    })
    expect(detail?.gradation?.strongStart).toBeUndefined()
  })

  test("infers hidden weak grade for säe", async () => {
    const detail = await getFinnishWordDetail("säe")

    expect(detail?.gradation).toMatchObject({
      pattern: "k-∅",
      strong: "k",
      weak: "ø",
      weakStart: 2,
    })
    expect(detail?.gradation?.strongStart).toBeUndefined()
  })

  test("infers hidden weak grade for pelätä", async () => {
    const detail = await getFinnishWordDetail("pelätä")

    expect(detail?.gradation).toMatchObject({
      pattern: "k-∅",
      strong: "k",
      weak: "ø",
      weakStart: 3,
    })
    expect(detail?.gradation?.strongStart).toBeUndefined()
  })

  test("keeps visible strong grade for lukea", async () => {
    const detail = await getFinnishWordDetail("lukea")

    expect(detail?.gradation).toMatchObject({
      pattern: "k-∅",
      strong: "k",
      weak: "ø",
      strongStart: 2,
    })
    expect(detail?.gradation?.weakStart).toBeUndefined()
  })

  test("keeps visible strong grade for jalka", async () => {
    const detail = await getFinnishWordDetail("jalka")

    expect(detail?.gradation).toMatchObject({
      pattern: "k-∅",
      strong: "k",
      weak: "ø",
      strongStart: 3,
    })
    expect(detail?.gradation?.weakStart).toBeUndefined()
  })

  test("does not change non-k-∅ gradation handling", async () => {
    const detail = await getFinnishWordDetail("matto")

    expect(detail?.gradation).toMatchObject({
      pattern: "tt-t",
      strong: "tt",
      weak: "t",
      strongStart: 2,
    })
    expect(detail?.gradation?.weakStart).toBeUndefined()
  })
})

describe("getFinnishWordDetail part-of-speech mapping", () => {
  for (const partOfSpeechCase of finnishPartOfSpeechCases) {
    test(`maps ${partOfSpeechCase.rawPartOfSpeech} to ${partOfSpeechCase.expectedPartOfSpeech}`, async () => {
      const detail = await getFinnishWordDetail(partOfSpeechCase.word)

      expect(detail?.rawPartOfSpeech).toBe(partOfSpeechCase.rawPartOfSpeech)
      expect(detail?.partOfSpeech).toBe(partOfSpeechCase.expectedPartOfSpeech)
    })
  }

  test("preserves raw part of speech per meaning group", async () => {
    const detail = await getFinnishWordDetail("joka-test")

    expect(detail?.rawPartOfSpeech).toBe("pron")
    expect(detail?.partOfSpeech).toBe("pronoun")
    expect(detail?.meaningGroups).toEqual([
      {
        rawPartOfSpeech: "pron",
        partOfSpeech: "pronoun",
        meanings: ["relative pronoun"],
      },
      {
        rawPartOfSpeech: "det",
        partOfSpeech: "determiner",
        meanings: ["determiner"],
      },
    ])
  })
})
