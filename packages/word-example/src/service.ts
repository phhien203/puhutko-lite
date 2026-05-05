import type { WordExampleRepository } from "./repository"
import type { WordExampleService } from "./types"

export function createWordExampleService(repository: WordExampleRepository): WordExampleService {
  return {
    async getWordExample(wordId) {
      return repository.getWordExample(wordId)
    },
    async saveWordExample(wordId, text) {
      const existingExample = await repository.getWordExample(wordId)

      if (existingExample && existingExample.text === text) {
        return existingExample
      }

      return repository.upsertWordExample(wordId, text)
    },
  }
}
