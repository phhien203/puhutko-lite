export type WordExample = {
  wordId: string
  text: string
  createdAt: string
  updatedAt: string
}

export type WordExampleService = {
  getWordExample(wordId: string): Promise<WordExample | null>
  saveWordExample(wordId: string, text: string): Promise<WordExample>
}
