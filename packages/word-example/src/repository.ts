import type { WordExample } from "./types"

export type WordExampleRepository = {
  getWordExample(wordId: string): Promise<WordExample | null>
  upsertWordExample(wordId: string, text: string): Promise<WordExample>
}
