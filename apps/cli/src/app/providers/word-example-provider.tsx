import { type WordExample } from "@puhutko/word-example"
import React from "react"
import { wordExampleService } from "../persistence"

type WordExampleContextValue = {
  changeToken: number
  getWordExample(wordId: string): Promise<WordExample | null>
  saveWordExample(wordId: string, text: string): Promise<WordExample>
}

type WordExampleProviderProps = {
  children: React.ReactNode
}

const WordExampleContext = React.createContext<WordExampleContextValue | null>(null)

export function WordExampleProvider({ children }: WordExampleProviderProps) {
  const [changeToken, setChangeToken] = React.useState(0)

  const value = React.useMemo<WordExampleContextValue>(
    () => ({
      changeToken,
      getWordExample: (wordId) => wordExampleService.getWordExample(wordId),
      saveWordExample: async (wordId, text) => {
        const wordExample = await wordExampleService.saveWordExample(wordId, text)
        setChangeToken((currentValue) => currentValue + 1)
        return wordExample
      },
    }),
    [changeToken],
  )

  return <WordExampleContext.Provider value={value}>{children}</WordExampleContext.Provider>
}

export function useWordExample() {
  const context = React.useContext(WordExampleContext)

  if (!context) {
    throw new Error("useWordExample must be used within WordExampleProvider")
  }

  return context
}
