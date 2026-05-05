import type { WordExampleRepository } from "../repository"
import type { WordExample } from "../types"

function cloneWordExample(wordExample: WordExample): WordExample {
  return { ...wordExample }
}

export function createMemoryWordExampleRepository(): WordExampleRepository {
  const wordExamples = new Map<string, WordExample>()

  return {
    async getWordExample(wordId) {
      const wordExample = wordExamples.get(wordId)
      return wordExample ? cloneWordExample(wordExample) : null
    },
    async upsertWordExample(wordId, text) {
      const existingExample = wordExamples.get(wordId)
      const now = new Date().toISOString()
      const wordExample: WordExample = existingExample
        ? {
            ...existingExample,
            text,
            updatedAt: now,
          }
        : {
            wordId,
            text,
            createdAt: now,
            updatedAt: now,
          }

      wordExamples.set(wordId, wordExample)
      return cloneWordExample(wordExample)
    },
  }
}
