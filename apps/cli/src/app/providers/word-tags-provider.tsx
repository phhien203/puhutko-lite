import { type Tag, type TagWithAssignment } from "@puhutko/word-tags"
import React from "react"
import { wordTagsService } from "../persistence"

type WordTagsContextValue = {
  changeToken: number
  listTagsForWord(wordId: string): Promise<TagWithAssignment[]>
  createTag(name: string): Promise<Tag>
  renameTag(tagId: string, name: string): Promise<Tag>
  deleteTag(tagId: string): Promise<void>
  toggleTagAssignment(wordId: string, tagId: string): Promise<boolean>
}

type WordTagsProviderProps = {
  children: React.ReactNode
}

const WordTagsContext = React.createContext<WordTagsContextValue | null>(null)

export function WordTagsProvider({ children }: WordTagsProviderProps) {
  const [changeToken, setChangeToken] = React.useState(0)

  const value = React.useMemo<WordTagsContextValue>(
    () => ({
      changeToken,
      listTagsForWord: (wordId) => wordTagsService.listTagsForWord(wordId),
      createTag: async (name) => {
        const tag = await wordTagsService.createTag(name)
        setChangeToken((currentValue) => currentValue + 1)
        return tag
      },
      renameTag: async (tagId, name) => {
        const tag = await wordTagsService.renameTag(tagId, name)
        setChangeToken((currentValue) => currentValue + 1)
        return tag
      },
      deleteTag: async (tagId) => {
        await wordTagsService.deleteTag(tagId)
        setChangeToken((currentValue) => currentValue + 1)
      },
      toggleTagAssignment: async (wordId, tagId) => {
        const assigned = await wordTagsService.toggleTagAssignment(wordId, tagId)
        setChangeToken((currentValue) => currentValue + 1)
        return assigned
      },
    }),
    [changeToken],
  )

  return <WordTagsContext.Provider value={value}>{children}</WordTagsContext.Provider>
}

export function useWordTags() {
  const context = React.useContext(WordTagsContext)

  if (!context) {
    throw new Error("useWordTags must be used within WordTagsProvider")
  }

  return context
}
